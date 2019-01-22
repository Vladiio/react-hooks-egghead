import {useContext, useReducer, useEffect, useRef} from 'react'
import isEqual from 'lodash/isEqual'
import PropTypes from 'prop-types'
import * as GitHub from '../../../github-client'

function useSetState(initialState) {
  const [state, setState] = useReducer(
    (prevState, action) => ({
      ...prevState,
      ...action,
    }),
    initialState,
  )

  return [state, setState]
}

function useSetSafeState(initialState) {
  const [state, setState] = useSetState(initialState)

  const mountedRef = useRef()
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const setSafeState = (...args) => mountedRef.current && setState(...args)

  return [state, setSafeState]
}

function useDeeplyCompareEffect(callback, inputs) {
  const cleanupRef = useRef()
  useEffect(() => {
    if (!isEqual(inputs, previousInputs)) {
      cleanupRef.current = callback()
    }
    return cleanupRef.current
  })
  const previousInputs = usePrevious(inputs)
}

function usePrevious(value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

function Query({query, variables, children, normalize = data => data}) {
  const client = useContext(GitHub.Context)
  const [state, setSafeState] = useSetSafeState({
    loaded: false,
    fetching: false,
    data: null,
    error: null,
  })

  useDeeplyCompareEffect(
    () => {
      setSafeState({fetching: true})
      client
        .request(query, variables)
        .then(res =>
          setSafeState({
            data: normalize(res),
            error: null,
            loaded: true,
            fetching: false,
          }),
        )
        .catch(error =>
          setSafeState({
            error,
            data: null,
            loaded: false,
            fetching: false,
          }),
        )
    },
    [query, variables],
  )

  return children(state)
}

Query.propTypes = {
  query: PropTypes.string.isRequired,
  variables: PropTypes.object,
  children: PropTypes.func.isRequired,
  normalize: PropTypes.func,
}

export default Query
