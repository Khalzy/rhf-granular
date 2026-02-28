import { useCallback, useLayoutEffect, useRef } from "react"

export const useStableRef = <Args extends unknown[], Return>(
    fn: (...args: Args) => Return
) => {
    const ref = useRef(fn)

    useLayoutEffect(() => {
        ref.current = fn
    }, [fn])

    return useCallback((...args: Args): Return => ref.current(...args), [])
}
