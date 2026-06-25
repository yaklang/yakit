import i18n from '@/i18n/i18n'
import { IMonacoCodeEditor, IMonacoEditor } from '../../utils/editors'
import { EncodeTag } from './templates/SingleTag'
import { IRange } from 'monaco-editor'
import './style.css'

export interface FuzzOperatorItem {
  name: string
  tag?: string
  callback?: (editor: IMonacoEditor) => any
  params?: []
  optionsRender: (s: string, callback: (s: string) => any) => any
}

export interface FuzzOperatorParam {
  key: string
  defaultValue?: string
  optional?: string
}

export const monacoEditorWrite = (editor: IMonacoEditor | IMonacoCodeEditor, text: string, range?: IRange | null) => {
  if (editor) {
    if (range) {
      editor.executeEdits(editor.getValue(), [{ range: range, text: text }])
      return
    }

    const selection = editor.getSelection()
    if (selection) {
      editor.executeEdits(editor.getValue(), [{ range: selection, text: text }])
    }
  }
}

export const monacoEditorReplace = (editor: IMonacoEditor | IMonacoCodeEditor, text: string) => {
  if (editor) editor.setValue(text)
}

export const monacoEditorClear = (editor?: IMonacoEditor | IMonacoCodeEditor) => {
  if (editor) {
    editor.getModel()?.setValue('')
  }
}

const highlightRanges: any[] = []

export const monacoEditorRemoveAllHighlight = (editor?: IMonacoEditor) => {
  if (editor && highlightRanges.length > 0) {
    editor.deltaDecorations(
      [],
      highlightRanges.map((i) => {
        return { range: i, options: { inlineClassName: undefined } } as any
      }),
    )
  }
}

export const encodeOperators: FuzzOperatorItem[] = [
  {
    name: i18n.t('FuzzerTemplates.uppercase_all', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'upper'} help={i18n.t('FuzzerTemplates.convert_tag_content_to_uppercase', { ns: 'webFuzzer' })} />
    ),
    tag: 'upper',
  },
  {
    name: i18n.t('FuzzerTemplates.lowercase_all', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'lower'} help={i18n.t('FuzzerTemplates.convert_tag_content_to_lowercase', { ns: 'webFuzzer' })} />
    ),
    tag: 'lower',
  },
  {
    name: i18n.t('FuzzerTemplates.parse_as_string_eg_str_xa0_x45', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag
        {...{ origin: s, setOrigin: callback }}
        tag={'str'}
        help={i18n.t('FuzzerTemplates.parse_as_string_e_g_str_xa0_x45_for_co', { ns: 'webFuzzer' })}
      />
    ),
    tag: 'str',
  },
  {
    name: i18n.t('FuzzerTemplates.base64_encode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'base64enc'} help={i18n.t('FuzzerTemplates.base64_encode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'base64enc',
  },
  {
    name: i18n.t('FuzzerTemplates.base64_decode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'base64dec'} help={i18n.t('FuzzerTemplates.base64_decode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'base64dec',
  },
  {
    name: i18n.t('FuzzerTemplates.hex_encode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'hex'} help={i18n.t('FuzzerTemplates.convert_tag_content_to_hex_encoding', { ns: 'webFuzzer' })} />
    ),
    tag: 'hex',
  },
  {
    name: i18n.t('FuzzerTemplates.hex_decode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'hexdec'} help={i18n.t('FuzzerTemplates.decode_tag_content_from_hex', { ns: 'webFuzzer' })} />
    ),
    tag: 'hexdec',
  },
  {
    name: i18n.t('FuzzerTemplates.calculate_sha1', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'sha1'} help={i18n.t('FuzzerTemplates.calculate_sha1_of_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'sha1',
  },
  {
    name: i18n.t('FuzzerTemplates.calculate_sha256', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'sha256'} help={i18n.t('FuzzerTemplates.calculate_sha256_of_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'sha256',
  },
  {
    name: i18n.t('FuzzerTemplates.calculate_sha512', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'sha512'} help={i18n.t('FuzzerTemplates.calculate_sha512_of_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'sha512',
  },
  {
    name: i18n.t('EncodeComponent.urlEncode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'urlenc'} help={i18n.t('FuzzerTemplates.url_encode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'urlenc',
  },
  {
    name: i18n.t('FuzzerTemplates.url_decode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'urldec'} help={i18n.t('FuzzerTemplates.url_decode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'urldec',
  },
  {
    name: i18n.t('FuzzerTemplates.double_url_encode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'doubleurlenc'} help={i18n.t('FuzzerTemplates.double_url_encode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'doubleurlenc',
  },
  {
    name: i18n.t('FuzzerTemplates.double_url_decode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'doubleurldec'} help={i18n.t('FuzzerTemplates.double_url_decode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'doubleurldec',
  },
  {
    name: i18n.t('FuzzerTemplates.html_xxxx_encode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'html'} help={i18n.t('FuzzerTemplates.html_xxxx_encode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'html',
  },
  {
    name: i18n.t('FuzzerTemplates.html_xaaaa_hex_encode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'htmlhex'} help={i18n.t('FuzzerTemplates.html_xaaaa_encode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'htmlhex',
  },
  {
    name: i18n.t('FuzzerTemplates.html_xxxx_decode', { ns: 'webFuzzer' }),
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'htmldec'} help={i18n.t('FuzzerTemplates.html_xxxx_decode_tag_content', { ns: 'webFuzzer' })} />
    ),
    tag: 'htmldec',
  },
  {
    name: i18n.t('FuzzerTemplates.ascii_encode', { ns: 'webFuzzer' }),
    tag: 'ascii',
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'ascii'} help={i18n.t('FuzzerTemplates.ascii_encode_tag_content', { ns: 'webFuzzer' })} />
    ),
  },
  {
    name: i18n.t('FuzzerTemplates.ascii_decode', { ns: 'webFuzzer' }),
    tag: 'asciidec',
    optionsRender: (s, callback) => (
      <EncodeTag {...{ origin: s, setOrigin: callback }} tag={'asciidec'} help={i18n.t('FuzzerTemplates.ascii_decode_tag_content', { ns: 'webFuzzer' })} />
    ),
  },
]
