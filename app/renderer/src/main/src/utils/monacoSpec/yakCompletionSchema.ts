import { editor, IRange, languages, Position } from 'monaco-editor'
import { CancellationToken } from 'typescript'
import { monaco } from 'react-monaco-editor'
import { getModelContext } from './yakEditor'
import { getAllRows } from '@/components/configNetwork/CustomizeCode'
import { TCustomCodeGeneral } from '@/components/configNetwork/CustomizeCodeTypes'
import { highlightKinds } from './fuzzHTTPMonacoSpec'

const { ipcRenderer } = window.require('electron')

// 自定义代码片段(QuerySnippets)缓存：补全在每次击键都会触发，
// 若每次都走 IPC 查询数据库会带来明显的性能开销。这里做一个短 TTL 缓存，
// 在连续输入期间复用结果，既保证性能，又能在片段被修改后很快刷新。
const CUSTOM_SNIPPETS_TTL = 5000
let _customSnippetsCache: { at: number; data: TCustomCodeGeneral<string[]> | undefined } | null = null
let _customSnippetsInflight: Promise<TCustomCodeGeneral<string[]> | undefined> | null = null

const queryCustomSnippetsCached = async (): Promise<TCustomCodeGeneral<string[]> | undefined> => {
  const now = Date.now()
  if (_customSnippetsCache && now - _customSnippetsCache.at < CUSTOM_SNIPPETS_TTL) {
    return _customSnippetsCache.data
  }
  // 合并同一时刻的并发请求，避免抖动期间重复查询
  if (_customSnippetsInflight) {
    return _customSnippetsInflight
  }
  const inflight: Promise<TCustomCodeGeneral<string[]> | undefined> = ipcRenderer
    .invoke('QuerySnippets', { Filter: {} })
    .then((data: TCustomCodeGeneral<string[]>) => {
      _customSnippetsCache = { at: Date.now(), data }
      return data
    })
    .catch((err) => {
      console.info(err)
      return undefined
    })
    .finally(() => {
      _customSnippetsInflight = null
    })
  _customSnippetsInflight = inflight
  return inflight
}

// 允许外部在片段增删改后主动失效缓存
export const invalidateCustomSnippetsCache = () => {
  _customSnippetsCache = null
}

export interface Range {
  Code: string
  StartLine: number
  StartColumn: number
  EndLine: number
  EndColumn: number
}

export interface SuggestionDescription {
  Label: string
  Description: string
  InsertText: string
  JustAppend: boolean
  DefinitionVerbose: string
  Kind: string
  Command: string
}
export interface YaklangLanguageSuggestionRequest {
  InspectType: 'completion' | 'hover' | 'signature' | 'definition' | 'reference'
  YakScriptType: 'yak' | 'mitm' | 'port-scan' | 'codec' | 'syntaxflow' | 'fuzztag'
  YakScriptCode: string
  Range: Range
}

export interface FuzzTagSuggestionRequest {
  InspectType: 'completion' | 'hover'
  HotPatchCode: string
  FuzztagCode: string
}

export interface YaklangLanguageSuggestionResponse {
  SuggestionMessage: SuggestionDescription[]
}

export interface YaklangLanguageFindResponse {
  URI: string
  Ranges: Range[]
}

export interface CompletionSchema {
  libName: string
  prefix: string
  functions: {
    functionName: string
    document?: string
    definitionStr: string
  }[]
}

export interface FieldsCompletion {
  isMethod: boolean
  fieldName: string
  fieldTypeVerbose: string
  libName?: string
  structName: string
  structNameShort: string
  methodsCompletion: string
  methodsCompletionVerbose: string
  isGolangBuildOrigin: string
}

export interface CompletionTotal {
  libNames: string[]
  libCompletions: CompletionSchema[]
  fieldsCompletions: FieldsCompletion[]
  libToFieldCompletions: { [index: string]: FieldsCompletion[] }
}

export const getSortTextByKindAndLabel = (kind: string, label: string): string => {
  let sortText = ''
  switch (getCompletionItemKindByName(kind)) {
    case languages.CompletionItemKind.Variable:
      sortText = '0'
      break
    case languages.CompletionItemKind.Field:
      sortText = '1'
      break
    case languages.CompletionItemKind.Function:
      sortText = '2'
      break
    case languages.CompletionItemKind.Method:
      sortText = '3'
      break
    case languages.CompletionItemKind.Module:
      sortText = '4'
      break
    case languages.CompletionItemKind.Constant:
      sortText = '5'
      break
    case languages.CompletionItemKind.Keyword:
      sortText = '6'
      break
    default:
      sortText = '7'
      break
  }
  sortText += label
  return sortText
}

let globalSuggestions: languages.CompletionItem[] = []
let completions: CompletionTotal = {
  libCompletions: [],
  fieldsCompletions: [],
  libNames: [],
  libToFieldCompletions: {},
}
let maxLibLength = 1
export const extraSuggestions: languages.CompletionItem[] = [
  {
    kind: languages.CompletionItemKind.Snippet,
    label: 'fn closure',
    insertText:
      'fn{\n' +
      '    defer fn{\n' +
      '        err := recover()\n' +
      '        if err != nil {\n' +
      '            log.error(`recover from panic: %v`, err)\n' +
      '        }\n' +
      '    }\n' +
      '    ${1}\n' +
      '}',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Snippets For Try-Catch-Finally',
  } as languages.CompletionItem,
  {
    kind: languages.CompletionItemKind.Snippet,
    label: 'try-catch-finally',
    insertText: 'try {\n' + '    ${1}\n' + '} catch err {\n' + '    ${2}\n' + '} finally {\n' + '    ${3}\n' + '}',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Snippets For Try-Catch-Finally',
  } as languages.CompletionItem,
  {
    kind: languages.CompletionItemKind.Snippet,
    label: 'try-catch',
    insertText: 'try {\n' + '    ${1}\n' + '} catch err {\n' + '    ${2}\n' + '}${3}',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Snippets For Try-Catch',
  } as languages.CompletionItem,
  {
    kind: languages.CompletionItemKind.Snippet,
    label: 'err',
    insertText: 'if ${1:err} != nil { die(${1:err}) }',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Snippets for input err quickly',
  } as languages.CompletionItem,
  {
    kind: languages.CompletionItemKind.Snippet,
    label: 'aes-cbc-pkcs7(pkcs) encrypt',
    insertText:
      'data = "${1:your-data}"\n' +
      'data = codec.PKCS7Padding([]byte(data))\n' +
      '\n' +
      'key, _ = codec.DecodeBase64("${2:key-base64}")\n' +
      '// key = codec.PKCS5Padding(key, 16)\n' +
      'key = codec.PKCS7Padding(key)\n' +
      '\n' +
      '// 设置 iv\n' +
      '// 如果不好设置 base64 的话，可以设置 iv = []byte("your-iv")\n' +
      'iv, _ = codec.DecodeBase64("${3:iv-base64}")\n' +
      '// iv = codec.PKCS5Padding(iv, 16)\n' +
      'iv = codec.PKCS7Padding(iv)\n' +
      '\n' +
      '// 开始调用加密函数\n' +
      'encryptData, err = codec.AESCBCEncrypt(key, data, iv)\n' +
      'base64Encrypted = codec.EncodeBase64(encryptData) # 例如 UMIKHDaF72Kh/zIFnAH2Pw==\n' +
      'hexEncrypted = codec.EncodeToHex(encryptData) # 例如 50c20a1c3685ef62a1ff32059c01f63f\n' +
      'base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) # 例如 UMIKHDaF72Kh%2FzIFnAH2Pw%3D%3D\n' +
      '\n',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'AES CBC PKCS7(PKCS5)',
  } as languages.CompletionItem,
  {
    kind: languages.CompletionItemKind.Snippet,
    label: 'aes-ecb-pkcs7 encrypt',
    insertText:
      '# 需要加密的原文\ndata = "this is data"\n' +
      '# 用到的 AES KEY，如果是 base64 编码可用这个解码，不是的话，可直接使用 key = []byte(`your-aes-key...`)\nkey, err = codec.DecodeBase64("${1}")\nkey = codec.PKCS7Padding(key)\n' +
      '# PKCS7Padding(data) / PKCS5Padding(data, 16/*block size*/)\ndata = codec.PKCS7Padding([]byte(data))\n\n' +
      '# 使用 AES ECB 加密内容，如果解密失败，可以查看 err 中错误原因\nencryptData, err = codec.AESECBEncrypt(key, data, nil)\n' +
      'base64Encrypted = codec.EncodeBase64(encryptData) # 例如 UMIKHDaF72Kh/zIFnAH2Pw==\n' +
      'hexEncrypted = codec.EncodeToHex(encryptData) # 例如 50c20a1c3685ef62a1ff32059c01f63f\n' +
      'base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) # 例如 UMIKHDaF72Kh%2FzIFnAH2Pw%3D%3D\n',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'AES ECB PKCS7',
  } as languages.CompletionItem,
  {
    kind: languages.CompletionItemKind.Snippet,
    label: 'aes-ecb-pkcs5 encrypt',
    insertText:
      '# 需要加密的原文\ndata = "this is data"\n' +
      '# 用到的 AES KEY，如果是 base64 编码可用这个解码，不是的话，可直接使用 key = []byte(`your-aes-key...`)\nkey, err = codec.DecodeBase64("${1}")\nkey = codec.PKCS5Padding(key, 16)\n' +
      '# PKCS7Padding(data) / PKCS5Padding(data, 16/*block size*/)\ndata = codec.PKCS5Padding([]byte(data), 16)\n\n' +
      '# 使用 AES ECB 加密内容，如果解密失败，可以查看 err 中错误原因\nencryptData, err = codec.AESECBEncrypt(key, data, nil)\n' +
      'base64Encrypted = codec.EncodeBase64(encryptData) # 例如 UMIKHDaF72Kh/zIFnAH2Pw==\n' +
      'hexEncrypted = codec.EncodeToHex(encryptData) # 例如 50c20a1c3685ef62a1ff32059c01f63f\n' +
      'base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) # 例如 UMIKHDaF72Kh%2FzIFnAH2Pw%3D%3D\n',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'AES ECB PKCS5',
  } as languages.CompletionItem,
]

export interface MethodSuggestion {
  Verbose: string
  FuzzKeywords: string[]
  ExactKeywords: string[]
  Regexp: string[]
  /*
    *
// 这个定义我们争取和 monaco editor suggestion 基本一致
message SuggestionDescription {
  string Label = 1;
  string Description = 2;
  string InsertText = 3;
  bool JustAppend = 4;
  string DefinitionVerbose = 5; // 展示定义的内容，如果没有的话，一般展示 InsertText 就行
  string Kind = 6; // 补全类型
}
    * */
  Suggestions: MethodSuggestionItem[]
}

interface MethodSuggestionItem {
  Label: string
  Description: string
  InsertText: string
  JustAppend: boolean
  DefinitionVerbose: string
  Kind: string
}

let YaklangBuildInMethodCompletion: MethodSuggestion[] = []

export function getCompletionItemKindByName(name: string): languages.CompletionItemKind {
  const itemKind = languages.CompletionItemKind[name as keyof typeof languages.CompletionItemKind]
  return itemKind !== undefined ? itemKind : languages.CompletionItemKind.Snippet
}

export const setYaklangBuildInMethodCompletion = (methods: MethodSuggestion[]) => {
  YaklangBuildInMethodCompletion = methods
}

export const setYaklangCompletions = (data: CompletionTotal) => {
  if (!data.libToFieldCompletions) {
    data.libToFieldCompletions = {}
  }

  data.libToFieldCompletions[`__global__`] = []
  completions = {
    libCompletions: data.libCompletions.filter((i) => !i.libName.startsWith('_')),
    fieldsCompletions: [],
    libNames: data.libNames.filter((i) => !i.startsWith('_')),
    libToFieldCompletions: data.libToFieldCompletions,
  }

  completions.libNames.map((i) => {
    if (i.length > maxLibLength) {
      maxLibLength = i.length
    }
  })

  const globalLibs = data.libCompletions.filter((i) => i.libName === '__global__')
  if (globalLibs.length <= 0) {
    return
  }
  globalSuggestions = globalLibs[0].functions.map((i) => {
    return {
      kind: languages.CompletionItemKind.Function,
      label: i.functionName,
      documentation: i.definitionStr,
      insertText: i.functionName,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    } as languages.CompletionItem
  })
}

export const getCompletions = () => {
  return completions
}

export const getGlobalCompletions = (): languages.CompletionItem[] => {
  return globalSuggestions
}

export const getDefaultCompletions = (position: Position): languages.CompletionItem[] => {
  return [...globalSuggestions, ...extraSuggestions].map((i) => {
    return {
      ...i,
      range: {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column || 0,
        endColumn: position.column || 0,
      },
    }
  })
}

export const getDefaultCompletionsWithRange = (range: IRange): languages.CompletionItem[] => {
  return [...globalSuggestions, ...extraSuggestions].map((i) => {
    return {
      ...i,
      range,
    }
  })
}

const removeRepeatedSuggestions = (params: languages.CompletionItem[]): languages.CompletionItem[] => {
  const results: languages.CompletionItem[] = []
  const labels: string[] = []

  params.forEach((i) => {
    const key = `${i.label}`
    if (labels.includes(key)) {
      return
    }
    labels.push(key)
    results.push(i)
  })
  return results
}

const loadMethodFromCaller = (caller: string, prefix: string, range: IRange): languages.CompletionItem[] => {
  if (!YaklangBuildInMethodCompletion) {
    return []
  }

  if (prefix.endsWith('].') || prefix.endsWith(').')) {
    // 无法判断 slice 内部和函数结果的内容，所以我们认为他是 raw
    caller = 'raw'
  } else if (prefix.endsWith(`".`) || prefix.endsWith('`.')) {
    // 认为这是一个 string
    caller = 's'
  } else if (prefix.endsWith(`}.`)) {
    // 认为这是一个 map
    caller = 'm'
  }

  const items: languages.CompletionItem[] = []
  const pushCompletion = (i: MethodSuggestion, desc: MethodSuggestionItem) => {
    const labelDef = !!desc.DefinitionVerbose ? `${desc.DefinitionVerbose}` : `${desc.InsertText}`
    items.push({
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      insertText: desc.InsertText,
      kind: languages.CompletionItemKind.Snippet,
      label: i.Verbose === '' ? `${labelDef}: ${desc.Description}` : `${i.Verbose}.${labelDef}:  ${desc.Description}`,
      detail: `${i.Verbose}`,
      range: range,
      documentation: desc.Description,
    })
  }

  YaklangBuildInMethodCompletion.forEach((i) => {
    // 精确匹配到需要补全的变量
    if (i.ExactKeywords.includes(caller)) {
      i.Suggestions.forEach((desc) => {
        pushCompletion(i, desc)
      })
      return
    }

    for (let j = 0; j < i.FuzzKeywords.length; j++) {
      const m = i.FuzzKeywords[j]
      if (caller.toLowerCase().includes(m.toLowerCase())) {
        i.Suggestions.forEach((desc) => {
          pushCompletion(i, desc)
        })
        return
      }
    }
  })
  return items
}

export const yaklangCompletionHandlerProvider = (
  model: editor.ITextModel,
  position: Position,
  context: languages.CompletionContext,
  token: CancellationToken,
): { suggestions: any[] } => {
  if (position === undefined) {
    return { suggestions: [] }
  }
  const { column, lineNumber } = position
  if (column === undefined || lineNumber === undefined) {
    return { suggestions: [] }
  }

  if ((position?.column || 0) <= 0) {
    return { suggestions: [] }
  }
  const beforeCursor = position.column - 1
  const line = model.getLineContent(position.lineNumber).substring(0, beforeCursor)
  const words = Array.from(line.matchAll(/\w+/g), (m) => m[0])
  const lastWord = words.length > 0 ? words[words.length - 1] : ''

  const startColumn = position.column - lastWord.length
  const replaceRange: IRange = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: startColumn > 0 ? startColumn : 0,
    endColumn: position.column || 0,
  }
  const insertRange: IRange = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: position.column || 0,
    endColumn: position.column || 0,
  }

  /*
   * 设置补全: 库补全
   * */
  let items: languages.CompletionItem[] = []
  const libCompletions = completions.libCompletions || []
  for (let i = 0; i < libCompletions.length; i++) {
    const currentLib = libCompletions[i]
    if (lastWord === currentLib.libName) {
      currentLib.functions.forEach((f) => {
        let compLabel = f.definitionStr.startsWith('func ') ? f.definitionStr.substring(5) : f.definitionStr
        compLabel = compLabel.startsWith(currentLib.libName + '.')
          ? compLabel.substring((currentLib.libName + '.').length)
          : compLabel
        items.push({
          insertText: f.functionName,
          detail: f.document,
          label: compLabel,
          kind: languages.CompletionItemKind.Snippet,
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: insertRange,
        })
      })
      return {
        suggestions: [...items, ...loadMethodFromCaller(lastWord, line, insertRange)],
      }
    }
  }

  if (items.length <= 0) {
    if (!line.endsWith('.')) {
      /*
       * 全局补全，不是方法补全
       * 如果光标前最后一个不是 . 的话！说明该进入全局补全的内容了
       * */
      return {
        suggestions: [
          ...completions.libNames.map((i) => {
            return {
              insertText: i,
              detail: i,
              label: i,
              kind: languages.CompletionItemKind.Struct,
              range: replaceRange,
            }
          }),
          ...getDefaultCompletionsWithRange(replaceRange),
        ].filter((i) => {
          return `${i.label}`.includes(lastWord)
        }),
      }
    } else {
      // 如果 . 有的话，一般这个时候需要筛选一下内容，来尝试补充字段名
      try {
        let value = model.getValueInRange({
          endColumn: position.column,
          endLineNumber: position.lineNumber,
          startColumn: 0,
          startLineNumber: 0,
        })
        if (value.length > 10000) {
          value = value.substring(value.length - 9999)
        }
        const fieldCompletion: FieldsCompletion[] = []
        const included = new Map<string, boolean>()
        const methodMerged = new Map<string, FieldsCompletion>()
        const fieldMerged = new Map<string, FieldsCompletion>()
        Array.from(value.matchAll(/[a-z]+/g), (m) => m[0]).map((i) => {
          if (i === '') {
            return
          }
          if (i.length > maxLibLength) {
            return
          }

          if (!!included.get(i)) {
            return
          } else {
            included.set(i, true)
          }
          if (!!completions.libToFieldCompletions[i]) {
            completions.libToFieldCompletions[i].map((comp) => {
              if (comp.isMethod) {
                const k = comp.methodsCompletionVerbose
                if (methodMerged.has(k)) {
                  const e = methodMerged.get(k)
                  if (e === undefined) {
                    return
                  }
                  e.structNameShort = `${e.structNameShort}/${comp.structNameShort}`
                } else {
                  methodMerged.set(k, { ...comp })
                }
              } else {
                const k = `${comp.fieldName}: ${comp.fieldTypeVerbose}`
                if (fieldMerged.has(k)) {
                  const e = fieldMerged.get(k)
                  if (e === undefined) {
                    return
                  }
                  e.structNameShort = `${e.structNameShort}/${comp.structNameShort}`
                } else {
                  fieldMerged.set(k, { ...comp })
                }
              }
            })
          }
        })

        fieldCompletion.push(...Array.from(fieldMerged.values()))
        fieldCompletion.push(...Array.from(methodMerged.values()))

        let suggestions: languages.CompletionItem[] = fieldCompletion.map((i) => {
          if (i.isMethod) {
            return {
              insertText: i.methodsCompletion,
              detail: `Method:${i.structNameShort}`,
              label: `${i.methodsCompletionVerbose}`,
              kind: languages.CompletionItemKind.Function,
              insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: insertRange,
            }
          }
          return {
            insertText: i.fieldName,
            detail: `Field:${i.structNameShort}`,
            label: `${i.fieldName}: ${i.fieldTypeVerbose}`,
            kind: languages.CompletionItemKind.Field,
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: insertRange,
          }
        })

        suggestions = [...suggestions, ...loadMethodFromCaller(lastWord, line, insertRange)]
        return { suggestions: removeRepeatedSuggestions(suggestions) }
      } catch (e) {
        console.info(e)
      }
    }
  }

  // 如果补全函数失败，则会认为
  return {
    suggestions: [],
  } as any
}

export const newYaklangCompletionHandlerProvider = (
  model: editor.ITextModel,
  position: Position,
  context: languages.CompletionContext,
  token: CancellationToken,
): Promise<{ incomplete: boolean; suggestions: languages.CompletionItem[] }> => {
  return new Promise(async (resolve, reject) => {
    if (position === undefined) {
      resolve({ incomplete: false, suggestions: [] })
      return
    }
    const { column, lineNumber } = position
    if (column === undefined || lineNumber === undefined) {
      resolve({ incomplete: false, suggestions: [] })
      return
    }

    if ((position?.column || 0) <= 0) {
      resolve({ incomplete: false, suggestions: [] })
      return
    }
    const iWord = getWordWithPointAtPosition(model, position)
    const type = getModelContext(model, 'plugin') || 'yak'

    // 获取自定义代码片段(带短 TTL 缓存，避免每次击键都查询数据库)
    const customCodeList = await queryCustomSnippetsCached()
    const targetCustomCode = getAllRows(customCodeList ?? ({} as TCustomCodeGeneral<string[]>)).filter(
      (it) => it.State === 'yak',
    )

    const transformCustomCode = targetCustomCode.map((it) => ({
      Label: it.Name,
      Description: highlightKinds.includes(it.Level) ? '```\n' + it.Code + '\n```' : it.Code,
      InsertText: it.Code,
      DefinitionVerbose: it.Description,
      Kind: it.Level,
      JustAppend: false,
      Command: '',
    }))

    await ipcRenderer
      .invoke('YaklangLanguageSuggestion', {
        InspectType: 'completion',
        YakScriptType: type,
        YakScriptCode: model.getValue(),
        ModelID: model.id,
        Range: {
          Code: iWord.word,
          StartLine: position.lineNumber,
          EndLine: position.lineNumber,
          StartColumn: iWord.startColumn,
          EndColumn: iWord.endColumn,
        } as Range,
      } as YaklangLanguageSuggestionRequest)
      .then((r: YaklangLanguageSuggestionResponse) => {
        if (r.SuggestionMessage.length > 0) {
          let range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: iWord.startColumn,
            endColumn: iWord.endColumn,
          }
          // 修复最后的range
          if (iWord.word.endsWith('.')) {
            range.startColumn = position.column
            range.endColumn = position.column
          } else if (iWord.word.indexOf('.') >= 0) {
            const index = iWord.word.lastIndexOf('.')
            range.startColumn = range.startColumn + index + 1
          }
          const targetSuggestions = r.SuggestionMessage?.concat(transformCustomCode)
          let suggestions = targetSuggestions.map((i) => {
            // 后端仅在「回调实参位置」下发 Kind==='Snippet' 的回调函数字面量补全
            // (如 poc.saveHandler(func(rsp){})，见 grpc_language_suggestion.go)。
            // 这类补全在当前上下文里最相关，给它最高排序并预选 func 声明式，方便直接 Tab 展开。
            const isCallbackSnippet = i.Kind === 'Snippet'
            const isFuncDeclSnippet = isCallbackSnippet && i.InsertText.startsWith('func(')
            return {
              insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
              insertText: i.InsertText,
              kind: getCompletionItemKindByName(i.Kind),
              label: i.Label,
              detail: i.DefinitionVerbose,
              documentation: { value: i.Description, isTrusted: true },
              range: range,
              preselect: isFuncDeclSnippet ? true : undefined,
              sortText: isCallbackSnippet ? '0' + i.Label : getSortTextByKindAndLabel(i.Kind, i.Label),
            } as languages.CompletionItem
          })

          resolve({
            incomplete: false,
            suggestions: suggestions,
          })
        }
        resolve({ incomplete: false, suggestions: [] })
      })
  })
}

// 获取光标所在的单词，如果光标前面是 . 的话，还会尝试往前找一个单词
// 例如: a.b.c.d 光标在 d 的位置，会返回 c.d
export const getWordWithPointAtPosition = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): editor.IWordAtPosition => {
  let iWord = model.getWordAtPosition(position)
  if (iWord === null) {
    iWord = { word: '', startColumn: position.column, endColumn: position.column }
  }
  let word = iWord.word
  let lastChar = model.getValueInRange({
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: iWord.startColumn - 1,
    endColumn: iWord.startColumn,
  })
  if (lastChar === '.') {
    // 尝试往前找一个单词
    let lastWord = model.getWordAtPosition(new monaco.Position(position.lineNumber, iWord.startColumn - 2))
    if (lastWord !== null) {
      iWord = { word: lastWord.word + '.' + word, startColumn: lastWord.startColumn, endColumn: iWord.endColumn }
    } else {
      iWord = { word: '.' + word, startColumn: iWord.startColumn - 1, endColumn: iWord.endColumn }
    }
  }

  return iWord
}

// ===== 回调函数参数：输入 "(" 时的精准自动触发 =====
// 目标：只在「确实带函数(回调)参数的库函数」后输入 "(" 时，自动弹出补全(展示 func(){} 骨架)，
// 而不是把 "(" 设为全局触发字符(那会让每个括号都弹窗、且频繁请求后端，影响性能)。
// 实现：对每个 callee 只做「一次」轻量后端判定(复用补全接口，看返回里是否有回调 Snippet)，
// 结果按 callee 名缓存；命中缓存后为纯本地判断，零额外请求。

// callee -> 是否带回调参数 的缓存(整会话复用；后端函数签名稳定，可安全长期缓存)
const _calleeHasCallbackCache = new Map<string, boolean>()

// 明显不是"函数调用"的关键字，输入其后的 "(" 不触发(if/for/switch 等)
const CALLEE_STOP_WORDS = new Set([
  'if',
  'for',
  'while',
  'switch',
  'func',
  'fn',
  'def',
  'return',
  'go',
  'defer',
  'catch',
  'else',
  'elif',
  'in',
  'range',
  'make',
  'new',
  'chan',
  'map',
  'import',
  'include',
  'assert',
  'try',
  'select',
  'case',
])

// 从当前行光标前文本里，提取紧邻 "(" 之前的调用名(如 poc.saveHandler)。无则返回 ''。
export const extractCalleeBeforeParen = (model: monaco.editor.ITextModel, position: monaco.Position): string => {
  try {
    const before = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    })
    // 光标前文本必须以 "标识符链(" 结尾
    const m = before.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\($/)
    return m ? m[1] : ''
  } catch (e) {
    return ''
  }
}

// 在输入 "(" 后，若 callee 是带回调参数的函数，则自动唤起补全。
// 全程 try/catch，任何异常都静默降级，绝不影响编辑器。
export const maybeAutoTriggerCallbackOnParen = async (
  editor: monaco.editor.ICodeEditor,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  scriptType: string,
): Promise<void> => {
  try {
    const callee = extractCalleeBeforeParen(model, position)
    if (!callee) return
    const lastSeg = callee.includes('.') ? callee.split('.').pop() || callee : callee
    if (CALLEE_STOP_WORDS.has(lastSeg)) return

    // 命中缓存：纯本地判断，零请求
    if (_calleeHasCallbackCache.has(callee)) {
      if (_calleeHasCallbackCache.get(callee)) {
        editor.trigger('yak-callback', 'editor.action.triggerSuggest', {})
      }
      return
    }

    // 未知 callee：做一次轻量探测(复用补全接口)。返回里出现 Kind==='Snippet'
    // 即代表后端认为「当前实参期望函数类型」(回调骨架)，仅回调场景才会出现。
    const iWord = getWordWithPointAtPosition(model, position)
    const resp: YaklangLanguageSuggestionResponse = await ipcRenderer.invoke('YaklangLanguageSuggestion', {
      InspectType: 'completion',
      YakScriptType: scriptType,
      YakScriptCode: model.getValue(),
      ModelID: model.id,
      Range: {
        Code: iWord.word,
        StartLine: position.lineNumber,
        EndLine: position.lineNumber,
        StartColumn: iWord.startColumn,
        EndColumn: iWord.endColumn,
      } as Range,
    } as YaklangLanguageSuggestionRequest)

    const hasCallback = !!resp && (resp.SuggestionMessage || []).some((i) => i.Kind === 'Snippet')
    _calleeHasCallbackCache.set(callee, hasCallback)
    if (hasCallback) {
      // 探测期间用户可能已移动光标/继续输入，触发前再确认仍在同一个 "(" 上下文
      const cur = editor.getPosition()
      if (cur && extractCalleeBeforeParen(model, cur) === callee) {
        editor.trigger('yak-callback', 'editor.action.triggerSuggest', {})
      }
    }
  } catch (e) {
    // ignore：自动触发失败不影响正常补全
  }
}
