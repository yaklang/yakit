let _childWindowHash = ''

export const getChildWindowHash = () => _childWindowHash

export const setChildWindowHash = (hash: string) => {
  _childWindowHash = hash
}
