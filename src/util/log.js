import chalk from 'chalk'

// TODO: This log states should/could be added to the context?
var message, errorsWithColor, logsDisabled
set({verbose: false, colors: true, disable: false})
// export {message}

/**
 * Set the lisgy log settings
 */
export function set ({verbose, colors, disable}) {
  logsDisabled = disable
  errorsWithColor = colors
  message = function (...args) {
    if (verbose && verbose >= args[0] && !logsDisabled) {
      if (args[0] === 0 && colors) {
        args[1] = chalk.bold.green(args[1])
      }
      args[0] = ''
      console.error.call(console.error, ...args)
    }
  }
  return message
}

export function error (...args) {
  if (errorsWithColor) {
    args[0] = chalk.bold.red(args[0])
  }
  if (!logsDisabled) {
    console.error.call(console.error, ...args)
  }
}

export function warning (...args) {
  if (errorsWithColor) {
    args[0] = chalk.bold.yellow(args[0])
  }
  if (!logsDisabled) {
    console.error.call(console.error, ...args)
  }
}
