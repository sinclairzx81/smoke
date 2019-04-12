module.exports = config => config.set({
  basePath: '',
  frameworks: ['mocha'],
  files:      ['../public/test/index.js' ],
  reporters:  ["dots"],
  port:       9876,
  colors:     true,
  logLevel:   config.LOG_INFO,
  autoWatch:  false,
  browsers:   ['ChromeHeadless'],
  singleRun:  true,
  concurrency: 8,
})

