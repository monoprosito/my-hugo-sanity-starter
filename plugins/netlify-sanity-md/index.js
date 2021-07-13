module.exports = {
  onPreBuild: async ({utils, packageJson}) => {
    console.log('My plugin is loaded!')

    const fs = require('fs-extra')
    const toMarkdown = require('@sanity/block-content-to-markdown')
    const client = require('@sanity/client')({
      projectId: 'o68f35gg',
      dataset: 'production',
      useCdn: false
    })
    const serializers = {
      types: {
        code: (props) => ```
          \`\`\`
          ${props.node.language}
          ${props.node.code}
          \`\`\`
        ```
      }
    }

    fs.readdir('./content', (err, files) => {
      if (err) console.log(err)
      else {
        files.forEach(file => {
          fs.unlink(`content//${file}`, err => {
          if (err) throw err
          })
        });
      }
    })

    try {
      await client
        .fetch('*[_type == "post"]{categories[]->{title}, date, slug, title, body}')
        .then((res) => {
          res.map(async (post) => {
            let frontmatter = '---'

            Object.keys(post).forEach((field) => {
              if (field === 'body') return

              if (field === 'slug') {
                frontmatter += `\n${field}: '${post.slug.current}'`
                return frontmatter
              } else if (field === 'categories') {
                frontmatter += `\n${field}: [${post.categories.map((category) => `'${category.title}'`)}]`
                return frontmatter
              } else {
                frontmatter += `\n${field}: '${post[field]}'`
              }
            })

            frontmatter += '\n---\n\n'
            const fullPost = `${frontmatter}${toMarkdown(post.body, {serializers})}`
            const filePath = `./content/${post.slug.current}.md`

            fs.outputFile(filePath, fullPost, (err, data) => {
              if (err) return console.log(err)
            })
          })
        })
    } catch (error) {
      utils.build.failBuild('Failure message', {error})
    }
  }
}