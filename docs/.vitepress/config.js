import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'GitHub Extractor CLI',
  description: 'Universal CLI tool to extract GitHub data (PRs, commits, issues, releases) into Markdown/JSON',
  
  base: '/GithubCLIExtractor/',
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Changelog', link: '/changelog/' }
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Export Formats', link: '/guide/export-formats' },
            { text: 'Diff Mode (Incremental Exports)', link: '/guide/diff-mode' },
            { text: 'Batch Processing', link: '/guide/batch-processing' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API',
          items: [
            { text: 'CLI Commands', link: '/api/commands' },
            { text: 'Export Options', link: '/api/options' },
            { text: 'Configuration File', link: '/api/config' }
          ]
        }
      ]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/LeSoviet/GithubCLIExtractor' }
    ],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 LeSoviet'
    }
  }
})