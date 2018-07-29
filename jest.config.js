module.exports = {
  transform: {
    "^.+\\.tsx?$": "<rootDir>/node_modules/ts-jest/preprocessor.js"
  },
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(tsx?)$",
  moduleNameMapper: {
    "\\.(css)$": "<rootDir>/node_modules/jest-css-modules"
  },
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ],
  testURL: "http://localhost/", // https://github.com/facebook/jest/issues/6769
}
