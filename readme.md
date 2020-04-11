# gatsby-source-tilda

Source plugin for pulling pages and and assets into Gatsby from [tilda.cc](https://tilda.cc/) project ([API](http://help.tilda.ws/api) available for [Bussiness Plan](https://tilda.cc/pricing/) only). 

## Install
`npm install --save gatsby-source-tilda`

## How to use

```
// In your gatsby-config.js
module.exports = {
  plugins: [
    {
       resolve: 'gatsby-source-tilda',
       options: {
         publicKey: process.env.TILDA_PUBLIC_KEY,       # tilda API public key
         secret: process.env.TILDA_SECRET_KEY,          # tilda API secret key
         projectId: process.env.TILDA_PROJECT_ID,       # tilda project Id to sync
         exclude: [],                                   # pages to exclude e.g. ['faq', 'folder/subfolder/blog-post-url']
       },
    },
  ],
}
```

## How to query

### Query pages
```
{
    allTildaPage {
      nodes {
        id
        pageId
        featureimg
        date
        projectid
        published
        alias
        initScripts
        title
        descr
        img
        css {
          from
          to
        }
        js {
          from
          to
        }
        images {
          from
          to
        }
        html         
      }
    }
}
```

### Query for assets
```
{
    allTildaAsset {
      nodes {
        from
        to
        localFile {
          publicURL
        }
      }
    }
}
```
