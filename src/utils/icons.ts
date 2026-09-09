const svgModules = import.meta.glob('../assets/icons/*.svg')
export const customSvgNames =
  Object.keys(svgModules)
    .map(path => path.match(/([^/]+)\.svg$/)![1])
export const isCustomSvg = (name?: string) => !!name && customSvgNames.includes(name)