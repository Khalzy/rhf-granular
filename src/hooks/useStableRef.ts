import { useLayoutEffect, useRef } from "react"

export const useStableRef = <RefFunction>(fn: RefFunction) => {
    const ref = useRef(fn)

    useLayoutEffect(() => {
        ref.current = fn
    }, [fn])

    return ref
}
