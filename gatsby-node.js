const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions

  // Define a template for blog post
  const blogPost = path.resolve(`./src/templates/blog-post.js`)
  // Get all markdown blog posts sorted by date
  const result = await graphql(
    `
      {
        allMarkdownRemark(
          sort: { fields: [frontmatter___date], order: ASC }
          limit: 1000
        ) {
          nodes {
            id
            fields {
              slug
            }
            html
            htmlAst
          }
        }
      }
    `
  )

  if (result.errors) {
    reporter.panicOnBuild(
      `There was an error loading your blog posts`,
      result.errors
    )
    return
  }

  const posts = result.data.allMarkdownRemark.nodes
  if (posts.length > 0) {
    posts.forEach((post, index) => {
      const previousPostId = index === 0 ? null : posts[index - 1].id
      const nextPostId = index === posts.length - 1 ? null : posts[index + 1].id

      // we have html here which runs before our create schema
      // but it disappears when we query for it down below
      console.log(post.html);

      createPage({
        path: post.fields.slug,
        component: blogPost,
        context: {
          id: post.id,
          previousPostId,
          nextPostId,
        },
      })
    })
  }
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })

    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}

exports.createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions;

  createTypes(`
    type SiteSiteMetadata {
      author: Author
      siteUrl: String
      social: Social
    }

    type Author {
      name: String
      summary: String
    }

    type Social {
      twitter: String
    }

    type MarkdownRemark implements Node {
      frontmatter: Frontmatter
      fields: Fields
    }

    type Frontmatter {
      title: String
      description: String
      date: Date @dateformat
    }

    type Fields {
      slug: String
    }

    type Post implements Node @dontInfer {
			id: ID!
      excerpt: String
			fields: Fields
			frontmatter: Frontmatter
			html: String
			rawMarkdownBody: String
			fileAbsolutePath: String
		}
  `);

  createTypes(schema.buildObjectType({
    name: "Query",
    fields: {
      allPosts: {
        type: ["Post"],
        args: { limit: `Int`, skip: `Int` },
        resolve: async (source, args, context, info) => {
          const { entries } = await context.nodeModel.findAll({
            type: "MarkdownRemark",
            query: {
              limit: args.limit,
              skip: args.skip,
              filter: {
                fileAbsolutePath: {
                  regex: "//content/posts//"
                }
              }
            }
          });

          entries.forEach(e => {
            if (e.html == null) {
              // for the sake of this demo we just exit here
              // as it's no use going further - point proven
              // since the html field is null
              console.error(`failed to grab html for: ${e.frontmatter.title}`);
              process.exit(1);
            }
          })

          return entries;
        }
      }
    }
  }));
}

// exports.createResolvers = ({ createResolvers }) => {
//   createResolvers({
//     Query: {
//       allPosts: {
//         type: ["Post"],
//         args: { limit: `Int`, skip: `Int` },
//         resolve: async (source, args, context, info) => {
//           const { entries } = await context.nodeModel.findAll({
//             type: "MarkdownRemark",
//             query: {
//               limit: args.limit,
//               skip: args.skip,
//               filter: {
//                 fileAbsolutePath: {
//                   regex: "//content/posts//"
//                 }
//               }
//             }
//           });

//           entries.forEach(e => {
//             if (e.html == null) {
//               // for the sake of this demo we just exit here
//               // as it's no use going further - point proven
//               // since the html field is null
//               console.error(`failed to grab html for: ${e.frontmatter.title}`);
//               process.exit(1);
//             }
//           })

//           return entries;
//         }
//       }
//     }
//   });
// }