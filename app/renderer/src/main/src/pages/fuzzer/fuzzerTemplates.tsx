import i18n from '@/i18n/i18n'
import { IMonacoCodeEditor, IMonacoEditor } from '../../utils/editors'
import { EncodeTag } from './templates/SingleTag'
import { IRange } from 'monaco-editor'
import './style.css'
const tOriginal = i18n.getFixedT(null, 'webFuzzer')

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

export const encodeOperators: () => FuzzOperatorItem[] = () => {
  return [
    {
      name: tOriginal('FuzzerTemplates.uppercase_all'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'upper'}
          help={tOriginal('FuzzerTemplates.convert_tag_content_to_uppercase')}
        />
      ),
      tag: 'upper',
    },
    {
      name: tOriginal('FuzzerTemplates.lowercase_all'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'lower'}
          help={tOriginal('FuzzerTemplates.convert_tag_content_to_lowercase')}
        />
      ),
      tag: 'lower',
    },
    {
      name: tOriginal('FuzzerTemplates.parse_as_string_eg_str_xa0_x45'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'str'}
          help={tOriginal('FuzzerTemplates.parse_as_string_e_g_str_xa0_x45_for_co')}
        />
      ),
      tag: 'str',
    },
    {
      name: tOriginal('FuzzerTemplates.base64_encode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'base64enc'}
          help={tOriginal('FuzzerTemplates.base64_encode_tag_content')}
        />
      ),
      tag: 'base64enc',
    },
    {
      name: tOriginal('FuzzerTemplates.base64_decode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'base64dec'}
          help={tOriginal('FuzzerTemplates.base64_decode_tag_content')}
        />
      ),
      tag: 'base64dec',
    },
    {
      name: tOriginal('FuzzerTemplates.hex_encode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'hex'}
          help={tOriginal('FuzzerTemplates.convert_tag_content_to_hex_encoding')}
        />
      ),
      tag: 'hex',
    },
    {
      name: tOriginal('FuzzerTemplates.hex_decode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'hexdec'}
          help={tOriginal('FuzzerTemplates.decode_tag_content_from_hex')}
        />
      ),
      tag: 'hexdec',
    },
    {
      name: tOriginal('FuzzerTemplates.calculate_sha1'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'sha1'}
          help={tOriginal('FuzzerTemplates.calculate_sha1_of_tag_content')}
        />
      ),
      tag: 'sha1',
    },
    {
      name: tOriginal('FuzzerTemplates.calculate_sha256'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'sha256'}
          help={tOriginal('FuzzerTemplates.calculate_sha256_of_tag_content')}
        />
      ),
      tag: 'sha256',
    },
    {
      name: tOriginal('FuzzerTemplates.calculate_sha512'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'sha512'}
          help={tOriginal('FuzzerTemplates.calculate_sha512_of_tag_content')}
        />
      ),
      tag: 'sha512',
    },
    {
      name: tOriginal('EncodeComponent.urlEncode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'urlenc'}
          help={tOriginal('FuzzerTemplates.url_encode_tag_content')}
        />
      ),
      tag: 'urlenc',
    },
    {
      name: tOriginal('FuzzerTemplates.url_decode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'urldec'}
          help={tOriginal('FuzzerTemplates.url_decode_tag_content')}
        />
      ),
      tag: 'urldec',
    },
    {
      name: tOriginal('FuzzerTemplates.double_url_encode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'doubleurlenc'}
          help={tOriginal('FuzzerTemplates.double_url_encode_tag_content')}
        />
      ),
      tag: 'doubleurlenc',
    },
    {
      name: tOriginal('FuzzerTemplates.double_url_decode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'doubleurldec'}
          help={tOriginal('FuzzerTemplates.double_url_decode_tag_content')}
        />
      ),
      tag: 'doubleurldec',
    },
    {
      name: tOriginal('FuzzerTemplates.html_xxxx_encode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'html'}
          help={tOriginal('FuzzerTemplates.html_xxxx_encode_tag_content')}
        />
      ),
      tag: 'html',
    },
    {
      name: tOriginal('FuzzerTemplates.html_xaaaa_hex_encode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'htmlhex'}
          help={tOriginal('FuzzerTemplates.html_xaaaa_encode_tag_content')}
        />
      ),
      tag: 'htmlhex',
    },
    {
      name: tOriginal('FuzzerTemplates.html_xxxx_decode'),
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'htmldec'}
          help={tOriginal('FuzzerTemplates.html_xxxx_decode_tag_content')}
        />
      ),
      tag: 'htmldec',
    },
    {
      name: tOriginal('FuzzerTemplates.ascii_encode'),
      tag: 'ascii',
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'ascii'}
          help={tOriginal('FuzzerTemplates.ascii_encode_tag_content')}
        />
      ),
    },
    {
      name: tOriginal('FuzzerTemplates.ascii_decode'),
      tag: 'asciidec',
      optionsRender: (s, callback) => (
        <EncodeTag
          {...{ origin: s, setOrigin: callback }}
          tag={'asciidec'}
          help={tOriginal('FuzzerTemplates.ascii_decode_tag_content')}
        />
      ),
    },
  ]
}
