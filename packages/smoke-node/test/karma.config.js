module.exports = config => config.set({
  basePath: '',
  frameworks: ['mocha'],
  files:      ['../public/test/index.js' ],
  reporters:  ["mocha"], // "dots"
  port:       9876,
  colors:     true,
  logLevel:   config.LOG_INFO,
  autoWatch:  false,
  browsers:   ['ChromeHeadless'],
  // browsers:   ['FirefoxHeadless'],
  // browsers:   ['ChromeHeadless', 'FirefoxHeadless'],
  singleRun:  true,
  concurrency: 1,
})

