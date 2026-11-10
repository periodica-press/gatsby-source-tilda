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
         skip: true / false,                            # skip tilda sync
         downloadAssets: true / false,                  # download all tilda assets (css/js/img) locally
         fetchConcurrency: 5,                           # max parallel requests when fetching pages (default 5)
         fetchRetries: 3,                               # retries of a failed page request: network errors, 429, 5xx (default 3)
         refetchAll: true / false,                      # fetch export of every page, not only new/republished ones (default false)
         onFetchError: 'fail' / 'use-cache',            # what to do when Tilda API fails: fail the build (default) or use cached pages
                                                        # (only where a cached version exists, content may be outdated)
         snapshotUrl: 'https://storage.yandexcloud.net/bucket', # read pages from a snapshot in a storage instead of Tilda API, see below
         exclude: [],                                   # pages to exclude e.g. ['faq', 'folder/subfolder/blog-post-url']
       },
    },
  ],
}
```

## Snapshot mode

Tilda API is limited (150 requests per hour) and may be unreachable from some CI runners. With the `snapshotUrl` option the plugin reads pages from a copy of Tilda API answers in a storage and makes no requests to Tilda (`publicKey` and `secret` are not needed). The copy is written by a separate job, e.g. a serverless function that runs by a timer.

Files the plugin reads (`schemaVersion` of `manifest.json` must be `1`):

```
{snapshotUrl}/v1/{projectId}/manifest.json    { "schemaVersion": 1, "projectId": "...", "syncedAt": "...", "pages": { "<id>": "<published>" } }
{snapshotUrl}/v1/{projectId}/pages.json       answer of getpageslist as is
{snapshotUrl}/v1/{projectId}/pages/<id>.json  answer of getpageexport as is
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

`localFile` will be empty if `downloadAssets = false`
