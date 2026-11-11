# Quipus

Product site for Quipus (the final S is silent), the AI workspace for TPAs and healthcare advocacy companies.

Quipus agents read every medical bill, EOB and fax on a member's case, find what's wrong and draft the dispute. Advocates review and approve, with Nia, the built-in assistant, doing the legwork. The page is written for B2B buyers (TPAs and advocacy companies); the retail version for individuals is shown only as a "coming soon" teaser.

## Run it

It's a static site with no build step. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Structure

```
index.html            the page
assets/css/site.css   all styles
assets/js/site.js     animations and interactions
assets/img/           favicon
```

External resources: fonts from Google Fonts (Crimson Pro, Geist, Geist Mono) and icons from Lucide (`lucide@0.460.0` via unpkg).

## Notes

Figures in the platform section come from a Grain Labs advocacy case study. Example names, providers and amounts elsewhere are sample data.
