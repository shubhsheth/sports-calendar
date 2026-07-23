# GitHub Pages redirect stub

After the site moves to Firebase Hosting, the old GitHub Pages URL
(`https://shubhsheth.github.io/sports-calendar/`) should redirect to the new
origin. These `index.html` / `404.html` files do a path-preserving client-side
redirect (GitHub Pages has no server-side redirects).

To publish (once, at deploy time — see the deploy checklist in
`spec/005-firebase-migration/005-firebase-migration-implement.md`):

1. Replace `__FIREBASE_URL__` in both files with the live Firebase URL, e.g.
   `https://<project>.web.app` (no trailing slash).
2. Push just these two files to the `gh-pages` branch, replacing the old build:

   ```bash
   git switch --orphan gh-pages-stub
   sed -i 's|__FIREBASE_URL__|https://<project>.web.app|g' \
     scripts/gh-pages-stub/index.html scripts/gh-pages-stub/404.html
   cp scripts/gh-pages-stub/index.html scripts/gh-pages-stub/404.html /tmp/stub/
   # publish /tmp/stub to the gh-pages branch (e.g. peaceiris/actions-gh-pages
   # or a manual push), then delete the local orphan branch.
   ```

Keep it up for a few months; with no existing users this is only for any stray
bookmarks. Once traffic is nil, the `gh-pages` branch can be deleted.
