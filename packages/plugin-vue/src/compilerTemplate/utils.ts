const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}

const camelizeRE = /-\w/g
/**
 * @private
 */
export const camelize: (str: string) => string = cacheStringFunction(
  (str: string): string => {
    return str.replace(camelizeRE, (c) => c.slice(1).toUpperCase())
  },
)
