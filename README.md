## Intro
A wiki-like theme for managing and presenting your content in Hugo - with special support for Sanskrit/ Indic languages (where mixed case words are common when Roman script is used).

- Full Article [pdf](https://sanskrit-coders.github.io/content/wsc2022/indic-site-framework.pdf)


## Features
![Annotated screenshot](images/screenshot_annotated.png)


Some notable things you get with this theme (in decreasing order of interest):

- Navigation
  - Collapsible "accordion" sidebar with automated directory listing.
  - Collapsible "accordion" table-of-contents for each page.
  - "Next and Previous" page navigation buttons.
- Search
  - JSON based title/ url search
  - Search engine optimization markup and indices - which you would use with various search engines.
- Reading
  - A layout which automatically adjusts to the user's screen size.
  - Embedding audio and video items. Ability to sequentially play audio tracks within a page.
  - Special formatting consideration for fonts which need to be displayed bigger (eg: Devanagari for sanskrit.)
  - Transliteration dropdown: scripts ranging from devanāgarī to grantha, brāhmī to ISO-15919.
  - Text to speech interface (under development).
  - Disqus for comments.
  - Collapsible detail sections.
- Content management
  - "Edit me" links.
  - Basic ability to include contents from another page using the same theme within another.
  - Inline annotation
  - Version control when backed by a GitHub-type online repository.
  - Support for optionally enabling MathML. [^mathml_note]
- Portability: We try to minimize the use of any specific templating language in favor of accomplishing stuff (menus, tables of contents, page inclusions) with javascript. This makes it a bit easier to move to another static website generator like hugo in the future.


[^mathml_note]: See layouts/partials/mathjax_tex_commands.html for useful tex shortcuts.

## Example sites

- https://vishvAsa.github.io/devaH/AryaH/hindukaH/rogAH/padyAni/corona-virus/
- https://vishvAsa.github.io/notes/
- https://sanskrit-coders.github.io/
- https://sanskrit.github.io/


## Usage
### Recommendations about config.toml
#### Recommended settings
disablePathToLower = true Since we assume mixed case to have special meaning.

#### canonifyURLs
canonifyURLs = True won't work well as of 20190304. .URL variable does will then not include the subdirectory portion of the basepath (ie kAvyam/ bit in http://localhost:1313/kAvyam/), leading to urls like http://localhost:1313/XYZ/padya/kAlidAsa/raghuvaMsha/01/ instead of  http://localhost:1313/kAvyam/XYZ/padya/kAlidAsa/raghuvaMsha/01/.


## Code Contributions
### JS and CSS
Javascript and css dependencies are mostly managed with npm and webpack.
If you modify javascript (src folder) or add some bundled css, you must rerun webpack. A good workflow for such development:

- Switch to webpack_src directory.
- Clean node_modules if needed.
- Run `npm install`
- Run `npm run watch`