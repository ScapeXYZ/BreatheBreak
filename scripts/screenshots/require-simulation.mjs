if (process.env.BREATHEBREAK_DEV_SIMULATION !== '1') {
  console.error('Refusing screenshot capture: set BREATHEBREAK_DEV_SIMULATION=1 explicitly.')
  process.exit(1)
}
