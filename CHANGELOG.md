# Changelog

## [0.5.0](https://github.com/TomEDX/Poli/compare/poli-v0.4.1...poli-v0.5.0) (2026-11-09)


### ✨ Features

* add a one-click local sign-in as a test editor ([#33](https://github.com/TomEDX/Poli/issues/33)) ([76958a8](https://github.com/TomEDX/Poli/commit/76958a884b6739a8b1d819eb8899002debb20c17))
* add the programme comparator ([#61](https://github.com/TomEDX/Poli/issues/61)) ([516e3e9](https://github.com/TomEDX/Poli/commit/516e3e968e0858bec7b643029d385bb5eceababf)), closes [#15](https://github.com/TomEDX/Poli/issues/15)
* collapse inner spaces of a text's official title ([#53](https://github.com/TomEDX/Poli/issues/53)) ([66d8ffd](https://github.com/TomEDX/Poli/commit/66d8ffd80b1e706a5a6147abfda43ecc38e6c751))
* let editors build each candidacy programme from extracts ([#40](https://github.com/TomEDX/Poli/issues/40)) ([3909c8a](https://github.com/TomEDX/Poli/commit/3909c8a3a3248c257a9ea0dbb40e38271a34af80))
* let editors enter texts, scrutins and amendments, and visitors filter the texts ([#38](https://github.com/TomEDX/Poli/issues/38)) ([52fbaa1](https://github.com/TomEDX/Poli/commit/52fbaa1fefa0ba2a3a4b818e624caf1d5161aa53))
* let editors link texts, amendments and scrutins to sources ([#39](https://github.com/TomEDX/Poli/issues/39)) ([43c2e65](https://github.com/TomEDX/Poli/commit/43c2e6514cd7bc1e62e4e773c1445940a285677e))
* let editors manage parties and candidacies ([#34](https://github.com/TomEDX/Poli/issues/34)) ([e48eccf](https://github.com/TomEDX/Poli/commit/e48eccff8ac29b618d5de9b01e59b942ed2e9d91))
* let editors manage sources and publish the Sources page with a spreadsheet export ([#37](https://github.com/TomEDX/Poli/issues/37)) ([f7aff21](https://github.com/TomEDX/Poli/commit/f7aff2183d8e827bbe658fddaa30606749a174f0))
* let editors write and publish the method page ([#56](https://github.com/TomEDX/Poli/issues/56)) ([b77fe8a](https://github.com/TomEDX/Poli/commit/b77fe8a7c0069417dbb31dcd1cae0fd015dd9fac)), closes [#20](https://github.com/TomEDX/Poli/issues/20)
* let editors write quiz questions and the positions of each candidacy ([#57](https://github.com/TomEDX/Poli/issues/57)) ([4ff9b96](https://github.com/TomEDX/Poli/commit/4ff9b9640bc1e8a08164f5d09737f34b31bc921f))
* let visitors take the full quiz and see their agreement scores ([#60](https://github.com/TomEDX/Poli/issues/60)) ([a9a3f42](https://github.com/TomEDX/Poli/commit/a9a3f420cd69292cc864e9b59c407bba617fb30f)), closes [#17](https://github.com/TomEDX/Poli/issues/17)
* party logos ([#59](https://github.com/TomEDX/Poli/issues/59)) ([f30b29e](https://github.com/TomEDX/Poli/commit/f30b29ef3a0d4f6f46ee23f601e0df523deab162)), closes [#58](https://github.com/TomEDX/Poli/issues/58)
* seed the legislature and let editors manage its parliamentary groups ([#36](https://github.com/TomEDX/Poli/issues/36)) ([ac763f4](https://github.com/TomEDX/Poli/commit/ac763f451df311839601cf8b3b7904c2c39b444f))
* share one navigation sidebar between the public site and the administration ([#70](https://github.com/TomEDX/Poli/issues/70)) ([c2e393b](https://github.com/TomEDX/Poli/commit/c2e393bc2f0a0e9353ecd8da6d1dd8c6974bf3b5)), closes [#67](https://github.com/TomEDX/Poli/issues/67)
* show every comparator topic on one page with an outline and pinned titles ([#66](https://github.com/TomEDX/Poli/issues/66)) ([6957f42](https://github.com/TomEDX/Poli/commit/6957f42b47c6c57405006447084f9c13b912511c)), closes [#65](https://github.com/TomEDX/Poli/issues/65)
* show the number of published texts on the home page ([#54](https://github.com/TomEDX/Poli/issues/54)) ([c9f6600](https://github.com/TomEDX/Poli/commit/c9f660087ab8ee9026d17eb4c1f4d1ef24bbc774))


### 🐛 Bug Fixes

* show the pointer cursor on every enabled clickable element ([#69](https://github.com/TomEDX/Poli/issues/69)) ([d1f593e](https://github.com/TomEDX/Poli/commit/d1f593e7b271c9c8f87f15d7e4894dd59b716043)), closes [#68](https://github.com/TomEDX/Poli/issues/68)
* stop Vercel builds from hanging on database queries ([#62](https://github.com/TomEDX/Poli/issues/62)) ([73f915a](https://github.com/TomEDX/Poli/commit/73f915a218f7fd3253df76ce28c25d0358bf4561))


### ♻️ Code Refactoring

* lay legislation and reference out in one folder per concept ([#42](https://github.com/TomEDX/Poli/issues/42)) ([1d5a380](https://github.com/TomEDX/Poli/commit/1d5a380b1dfba3df9ea820078852ab78624a22e4))
* link every content to its sources through one reference module ([#44](https://github.com/TomEDX/Poli/issues/44)) ([2a8d67a](https://github.com/TomEDX/Poli/commit/2a8d67a2a73b2d328d7e0e1527fe359328c2b0ef))
* translate every write refusal through one shared module ([#41](https://github.com/TomEDX/Poli/issues/41)) ([a6abbb4](https://github.com/TomEDX/Poli/commit/a6abbb4c8c05ff00241174ab862973fb7a7a69e3))


### 🧹 Miscellaneous Chores

* enforce the file layout with ESLint and add the coding standards ([#52](https://github.com/TomEDX/Poli/issues/52)) ([34dd72a](https://github.com/TomEDX/Poli/commit/34dd72a0dfd28ac27b739d620351ed9394e31159))


### 👷 Continuous Integration

* add a Seed workflow that fills poli-develop with the fictional dataset ([#63](https://github.com/TomEDX/Poli/issues/63)) ([52bd9c5](https://github.com/TomEDX/Poli/commit/52bd9c5a490d092a4ae186cc1faefcb57ddc2377))
* add icons to the release note sections and drop the release-please banner ([#46](https://github.com/TomEDX/Poli/issues/46)) ([e86e652](https://github.com/TomEDX/Poli/commit/e86e6522decb5ee29613fa425e34c2fe8f0f4b4d))
* allow long lines in commit bodies taken from pull request descriptions ([#71](https://github.com/TomEDX/Poli/issues/71)) ([c39259d](https://github.com/TomEDX/Poli/commit/c39259d2274dcaaa7eb1dd5f5ec7d072d4b73a62))
* let the Seed workflow reset develop to the whole fictional dataset ([#64](https://github.com/TomEDX/Poli/issues/64)) ([080a8eb](https://github.com/TomEDX/Poli/commit/080a8eb29ed0477e16e5d0549ccadb2b68d16d6c))
* show continuous integration changes in the release notes ([#47](https://github.com/TomEDX/Poli/issues/47)) ([efdaa3f](https://github.com/TomEDX/Poli/commit/efdaa3f63371dc7253f5bcd02e87973f3d2912fb))
* show refactors and chores in the release notes ([#45](https://github.com/TomEDX/Poli/issues/45)) ([d662515](https://github.com/TomEDX/Poli/commit/d662515ac14b0cc9d159632a2917c7a2bbb2184f))

## [0.4.1](https://github.com/TomEDX/Poli/compare/poli-v0.4.0...poli-v0.4.1) (2026-11-06)


### Bug Fixes

* edit only the changed field of a topic, and build every editor write with editorWrite ([#31](https://github.com/TomEDX/Poli/issues/31)) ([cced345](https://github.com/TomEDX/Poli/commit/cced3452434644ae6cc670fe5a689c0de7b0eb1d))

## [0.4.0](https://github.com/TomEDX/Poli/compare/poli-v0.3.0...poli-v0.4.0) (2026-11-06)


### Features

* let editors manage topics and subtopics ([#29](https://github.com/TomEDX/Poli/issues/29)) ([beb9f20](https://github.com/TomEDX/Poli/commit/beb9f20046fca23f2a5e3f4803eb9ba95c5ce300))

## [0.3.0](https://github.com/TomEDX/Poli/compare/poli-v0.2.0...poli-v0.3.0) (2026-11-05)


### Features

* sign editors in with a magic link ([#27](https://github.com/TomEDX/Poli/issues/27)) ([3efa941](https://github.com/TomEDX/Poli/commit/3efa9412df70888b1c0aabf91fbab4d96ff8450e)), closes [#4](https://github.com/TomEDX/Poli/issues/4)

## [0.2.0](https://github.com/TomEDX/Poli/compare/poli-v0.1.0...poli-v0.2.0) (2026-11-05)


### Features

* project foundation ([68e694e](https://github.com/TomEDX/Poli/commit/68e694e42c3f2b14e40c305c747b2b2d1c2e0eb3)), closes [#2](https://github.com/TomEDX/Poli/issues/2)
