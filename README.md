## @hyrious/done

A command line tool to help standardize release.

Just run `npx @hyrious/done`.

### Diff. with [`done`](https://github.com/unix/done)

- Preview next version in command line.
- Handle npm v7 (which updates package-lock.json on release).
- Provide alter bin named `npm-done` to prevent conflict with `shell` reservations.\
  However, it does not mean it is only for `npm`. `yarn` & `pnpm` are also supported.
- Doesn't bundle everything.\
  It helps installing because `semver` is already a dependency of `npm` and many other tools.

### Known Issue

PRs are welcome.

- Yarn2+ is not supported yet.
  Checkout [their docs](https://yarnpkg.com/cli/version) to see how to make it.

### Why

I made this tiny cli for my personal convenience,
it's just working without many options.

### See Also

- [np](https://github.com/sindresorhus/np)
- [release-it](https://github.com/release-it/release-it)

### License

MIT @ [hyrious](https://github.com/hyrious)
