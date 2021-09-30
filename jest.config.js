module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(tsx?)$",
  moduleNameMapper: {
    "\\.(css)$": "<rootDir>/node_modules/jest-css-modules",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testURL: "http://localhost/", // https://github.com/facebook/jest/issues/6769
}
