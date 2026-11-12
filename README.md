# Quipus

Product site for Quipus (the final S is silent): bill advocacy and care finding for TPAs and advocacy teams.

Quipus reads what members send, finds what is wrong on a bill or the best-priced care, and prepares the reply. Advocates review and approve, with Nia, the built-in assistant, doing the legwork. The site is written for B2B buyers (TPAs and advocacy providers).

## Run it

It's a static site with no build step. Serve the folder (the pages use root-relative paths):

```bash
npx serve .
```

## Pages

| URL           | What it is                                                                 |
|---------------|----------------------------------------------------------------------------|
| `/`           | The live site: content brief plus meeting changes, the latest version      |
| `/members/`   | What members get, told from the member's side (linked as "For members")    |
| `/version2/`  | Draft: the original page in the indigo palette, for comparison             |
| `/version3/`  | Draft: content brief plus meeting changes, before the latest fixes         |
| `/version4/`  | Draft: the content brief as written (PDF exact), for comparison            |
| `/version5/`  | Draft: the PDF's wording, on the live design (no section labels or tags)   |
| `/brand/`     | The brand book                                                             |

Drafts carry `<meta name="robots" content="noindex">` so only the live pages appear in search.

## Structure

```
index.html                live page
members/index.html        members page
assets/css/site.css       shared styles; every colour lives in its :root block
assets/css/live.css       layout additions for the live pages only
assets/js/site.js         shared animations and interactions (drafts)
assets/js/live.js         the live pages' copy of site.js, with the latest fixes
assets/img/               favicon, logo files, link-preview image (og-image.png)
version2/                 indigo draft (own site.css and favicon)
version3/                 draft (v3.css)
version4/                 PDF-exact draft
version5/                 PDF word-for-word draft (uses the live script and styles)
brand/                    brand book and logo files
```

To change colours, edit the `:root` block in `assets/css/site.css` (or `version2/site.css` for the indigo draft). Pages and scripts use variables only.

External resources: fonts from Google Fonts (Crimson Pro, Geist, Geist Mono) and icons from Lucide (`lucide@0.460.0` via unpkg).

## Notes

Figures in the platform section come from a Grain Labs advocacy case study. Example names, providers and amounts elsewhere are sample data, labelled "Illustrative case" where they appear as a worked example.
