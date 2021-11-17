import {monaco} from "react-monaco-editor";

// https://github.com/brijeshb42/monaco-themes/tree/master/themes
monaco.editor.defineTheme("github", {
    "base": "vs",
    "inherit": true,
    "rules": [
        {
            "background": "F8F8FF",
            "token": ""
        },
        {
            "foreground": "999988",
            "fontStyle": "italic",
            "token": "comment"
        },
        {
            "foreground": "999999",
            "fontStyle": "bold",
            "token": "comment.block.preprocessor"
        },
        {
            "foreground": "999999",
            "fontStyle": "bold italic",
            "token": "comment.documentation"
        },
        {
            "foreground": "999999",
            "fontStyle": "bold italic",
            "token": "comment.block.documentation"
        },
        {
            "foreground": "a61717",
            "background": "e3d2d2",
            "token": "invalid.illegal"
        },
        {
            "fontStyle": "bold",
            "token": "keyword"
        },
        {
            "fontStyle": "bold",
            "token": "storage"
        },
        {
            "fontStyle": "bold",
            "token": "keyword.operator"
        },
        {
            "fontStyle": "bold",
            "token": "constant.language"
        },
        {
            "fontStyle": "bold",
            "token": "support.constant"
        },
        {
            "foreground": "445588",
            "fontStyle": "bold",
            "token": "storage.type"
        },
        {
            "foreground": "445588",
            "fontStyle": "bold",
            "token": "support.type"
        },
        {
            "foreground": "008080",
            "token": "entity.other.attribute-name"
        },
        {
            "foreground": "0086b3",
            "token": "variable.other"
        },
        {
            "foreground": "999999",
            "token": "variable.language"
        },
        {
            "foreground": "445588",
            "fontStyle": "bold",
            "token": "entity.name.type"
        },
        {
            "foreground": "445588",
            "fontStyle": "bold",
            "token": "entity.other.inherited-class"
        },
        {
            "foreground": "445588",
            "fontStyle": "bold",
            "token": "support.class"
        },
        {
            "foreground": "008080",
            "token": "variable.other.constant"
        },
        {
            "foreground": "800080",
            "token": "constant.character.entity"
        },
        {
            "foreground": "990000",
            "token": "entity.name.exception"
        },
        {
            "foreground": "990000",
            "token": "entity.name.function"
        },
        {
            "foreground": "990000",
            "token": "support.function"
        },
        {
            "foreground": "990000",
            "token": "keyword.other.name-of-parameter"
        },
        {
            "foreground": "555555",
            "token": "entity.name.section"
        },
        {
            "foreground": "000080",
            "token": "entity.name.tag"
        },
        {
            "foreground": "008080",
            "token": "variable.parameter"
        },
        {
            "foreground": "008080",
            "token": "support.variable"
        },
        {
            "foreground": "009999",
            "token": "constant.numeric"
        },
        {
            "foreground": "009999",
            "token": "constant.other"
        },
        {
            "foreground": "dd1144",
            "token": "string - string source"
        },
        {
            "foreground": "dd1144",
            "token": "constant.character"
        },
        {
            "foreground": "009926",
            "token": "string.regexp"
        },
        {
            "foreground": "990073",
            "token": "constant.other.symbol"
        },
        {
            "fontStyle": "bold",
            "token": "punctuation"
        },
        {
            "foreground": "000000",
            "background": "ffdddd",
            "token": "markup.deleted"
        },
        {
            "fontStyle": "italic",
            "token": "markup.italic"
        },
        {
            "foreground": "aa0000",
            "token": "markup.error"
        },
        {
            "foreground": "999999",
            "token": "markup.heading.1"
        },
        {
            "foreground": "000000",
            "background": "ddffdd",
            "token": "markup.inserted"
        },
        {
            "foreground": "888888",
            "token": "markup.output"
        },
        {
            "foreground": "888888",
            "token": "markup.raw"
        },
        {
            "foreground": "555555",
            "token": "markup.prompt"
        },
        {
            "fontStyle": "bold",
            "token": "markup.bold"
        },
        {
            "foreground": "aaaaaa",
            "token": "markup.heading"
        },
        {
            "foreground": "aa0000",
            "token": "markup.traceback"
        },
        {
            "fontStyle": "underline",
            "token": "markup.underline"
        },
        {
            "foreground": "999999",
            "background": "eaf2f5",
            "token": "meta.diff.range"
        },
        {
            "foreground": "999999",
            "background": "eaf2f5",
            "token": "meta.diff.index"
        },
        {
            "foreground": "999999",
            "background": "eaf2f5",
            "token": "meta.separator"
        },
        {
            "foreground": "999999",
            "background": "ffdddd",
            "token": "meta.diff.header.from-file"
        },
        {
            "foreground": "999999",
            "background": "ddffdd",
            "token": "meta.diff.header.to-file"
        },
        {
            "foreground": "4183c4",
            "token": "meta.link"
        }
    ],
    "colors": {
        "editor.foreground": "#000000",
        "editor.background": "#F8F8FF",
        "editor.selectionBackground": "#B4D5FE",
        "editor.lineHighlightBackground": "#FFFEEB",
        "editorCursor.foreground": "#666666",
        "editorWhitespace.foreground": "#BBBBBB"
    }
})
monaco.editor.defineTheme("solarized-light", {
    "base": "vs",
    "inherit": true,
    "rules": [
        {
            "background": "FDF6E3",
            "token": ""
        },
        {
            "foreground": "93a1a1",
            "token": "comment"
        },
        {
            "foreground": "2aa198",
            "token": "string"
        },
        {
            "foreground": "586e75",
            "token": "string"
        },
        {
            "foreground": "dc322f",
            "token": "string.regexp"
        },
        {
            "foreground": "d33682",
            "token": "constant.numeric"
        },
        {
            "foreground": "268bd2",
            "token": "variable.language"
        },
        {
            "foreground": "268bd2",
            "token": "variable.other"
        },
        {
            "foreground": "859900",
            "token": "keyword"
        },
        {
            "foreground": "073642",
            "fontStyle": "bold",
            "token": "storage"
        },
        {
            "foreground": "268bd2",
            "token": "entity.name.class"
        },
        {
            "foreground": "268bd2",
            "token": "entity.name.type.class"
        },
        {
            "foreground": "268bd2",
            "token": "entity.name.function"
        },
        {
            "foreground": "859900",
            "token": "punctuation.definition.variable"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.section.embedded.begin"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.section.embedded.end"
        },
        {
            "foreground": "b58900",
            "token": "constant.language"
        },
        {
            "foreground": "b58900",
            "token": "meta.preprocessor"
        },
        {
            "foreground": "dc322f",
            "token": "support.function.construct"
        },
        {
            "foreground": "dc322f",
            "token": "keyword.other.new"
        },
        {
            "foreground": "cb4b16",
            "token": "constant.character"
        },
        {
            "foreground": "cb4b16",
            "token": "constant.other"
        },
        {
            "foreground": "268bd2",
            "fontStyle": "bold",
            "token": "entity.name.tag"
        },
        {
            "foreground": "93a1a1",
            "token": "punctuation.definition.tag.html"
        },
        {
            "foreground": "93a1a1",
            "token": "punctuation.definition.tag.begin"
        },
        {
            "foreground": "93a1a1",
            "token": "punctuation.definition.tag.end"
        },
        {
            "foreground": "93a1a1",
            "token": "entity.other.attribute-name"
        },
        {
            "foreground": "268bd2",
            "token": "support.function"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.separator.continuation"
        },
        {
            "foreground": "859900",
            "token": "support.type"
        },
        {
            "foreground": "859900",
            "token": "support.class"
        },
        {
            "foreground": "cb4b16",
            "token": "support.type.exception"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.other.special-method"
        },
        {
            "foreground": "2aa198",
            "token": "string.quoted.double"
        },
        {
            "foreground": "2aa198",
            "token": "string.quoted.single"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.begin"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.end"
        },
        {
            "foreground": "b58900",
            "token": "entity.name.tag.css"
        },
        {
            "foreground": "b58900",
            "token": "support.type.property-name.css"
        },
        {
            "foreground": "b58900",
            "token": "meta.property-name.css"
        },
        {
            "foreground": "dc322f",
            "token": "source.css"
        },
        {
            "foreground": "586e75",
            "token": "meta.selector.css"
        },
        {
            "foreground": "6c71c4",
            "token": "punctuation.section.property-list.css"
        },
        {
            "foreground": "2aa198",
            "token": "meta.property-value.css constant.numeric.css"
        },
        {
            "foreground": "2aa198",
            "token": "keyword.other.unit.css"
        },
        {
            "foreground": "2aa198",
            "token": "constant.other.color.rgb-value.css"
        },
        {
            "foreground": "2aa198",
            "token": "meta.property-value.css"
        },
        {
            "foreground": "dc322f",
            "token": "keyword.other.important.css"
        },
        {
            "foreground": "2aa198",
            "token": "support.constant.color"
        },
        {
            "foreground": "859900",
            "token": "entity.name.tag.css"
        },
        {
            "foreground": "586e75",
            "token": "punctuation.separator.key-value.css"
        },
        {
            "foreground": "586e75",
            "token": "punctuation.terminator.rule.css"
        },
        {
            "foreground": "268bd2",
            "token": "entity.other.attribute-name.class.css"
        },
        {
            "foreground": "cb4b16",
            "token": "entity.other.attribute-name.pseudo-element.css"
        },
        {
            "foreground": "cb4b16",
            "token": "entity.other.attribute-name.pseudo-class.css"
        },
        {
            "foreground": "268bd2",
            "token": "entity.other.attribute-name.id.css"
        },
        {
            "foreground": "b58900",
            "token": "meta.function.js"
        },
        {
            "foreground": "b58900",
            "token": "entity.name.function.js"
        },
        {
            "foreground": "b58900",
            "token": "support.function.dom.js"
        },
        {
            "foreground": "b58900",
            "token": "text.html.basic source.js.embedded.html"
        },
        {
            "foreground": "268bd2",
            "token": "storage.type.function.js"
        },
        {
            "foreground": "2aa198",
            "token": "constant.numeric.js"
        },
        {
            "foreground": "268bd2",
            "token": "meta.brace.square.js"
        },
        {
            "foreground": "268bd2",
            "token": "storage.type.js"
        },
        {
            "foreground": "93a1a1",
            "token": "meta.brace.round"
        },
        {
            "foreground": "93a1a1",
            "token": "punctuation.definition.parameters.begin.js"
        },
        {
            "foreground": "93a1a1",
            "token": "punctuation.definition.parameters.end.js"
        },
        {
            "foreground": "268bd2",
            "token": "meta.brace.curly.js"
        },
        {
            "foreground": "93a1a1",
            "fontStyle": "italic",
            "token": "entity.name.tag.doctype.html"
        },
        {
            "foreground": "93a1a1",
            "fontStyle": "italic",
            "token": "meta.tag.sgml.html"
        },
        {
            "foreground": "93a1a1",
            "fontStyle": "italic",
            "token": "string.quoted.double.doctype.identifiers-and-DTDs.html"
        },
        {
            "foreground": "839496",
            "fontStyle": "italic",
            "token": "comment.block.html"
        },
        {
            "fontStyle": "italic",
            "token": "entity.name.tag.script.html"
        },
        {
            "foreground": "2aa198",
            "token": "source.css.embedded.html string.quoted.double.html"
        },
        {
            "foreground": "cb4b16",
            "fontStyle": "bold",
            "token": "text.html.ruby"
        },
        {
            "foreground": "657b83",
            "token": "text.html.basic meta.tag.other.html"
        },
        {
            "foreground": "657b83",
            "token": "text.html.basic meta.tag.any.html"
        },
        {
            "foreground": "657b83",
            "token": "text.html.basic meta.tag.block.any"
        },
        {
            "foreground": "657b83",
            "token": "text.html.basic meta.tag.inline.any"
        },
        {
            "foreground": "657b83",
            "token": "text.html.basic meta.tag.structure.any.html"
        },
        {
            "foreground": "657b83",
            "token": "text.html.basic source.js.embedded.html"
        },
        {
            "foreground": "657b83",
            "token": "punctuation.separator.key-value.html"
        },
        {
            "foreground": "657b83",
            "token": "text.html.basic entity.other.attribute-name.html"
        },
        {
            "foreground": "2aa198",
            "token": "text.html.basic meta.tag.structure.any.html punctuation.definition.string.begin.html"
        },
        {
            "foreground": "2aa198",
            "token": "punctuation.definition.string.begin.html"
        },
        {
            "foreground": "2aa198",
            "token": "punctuation.definition.string.end.html"
        },
        {
            "foreground": "268bd2",
            "fontStyle": "bold",
            "token": "entity.name.tag.block.any.html"
        },
        {
            "fontStyle": "italic",
            "token": "source.css.embedded.html entity.name.tag.style.html"
        },
        {
            "foreground": "839496",
            "fontStyle": "italic",
            "token": "source.css.embedded.html"
        },
        {
            "foreground": "839496",
            "fontStyle": "italic",
            "token": "comment.block.html"
        },
        {
            "foreground": "268bd2",
            "token": "punctuation.definition.variable.ruby"
        },
        {
            "foreground": "657b83",
            "token": "meta.function.method.with-arguments.ruby"
        },
        {
            "foreground": "2aa198",
            "token": "variable.language.ruby"
        },
        {
            "foreground": "268bd2",
            "token": "entity.name.function.ruby"
        },
        {
            "foreground": "859900",
            "fontStyle": "bold",
            "token": "keyword.control.ruby"
        },
        {
            "foreground": "859900",
            "fontStyle": "bold",
            "token": "keyword.control.def.ruby"
        },
        {
            "foreground": "859900",
            "token": "keyword.control.class.ruby"
        },
        {
            "foreground": "859900",
            "token": "meta.class.ruby"
        },
        {
            "foreground": "b58900",
            "token": "entity.name.type.class.ruby"
        },
        {
            "foreground": "859900",
            "token": "keyword.control.ruby"
        },
        {
            "foreground": "b58900",
            "token": "support.class.ruby"
        },
        {
            "foreground": "859900",
            "token": "keyword.other.special-method.ruby"
        },
        {
            "foreground": "2aa198",
            "token": "constant.language.ruby"
        },
        {
            "foreground": "2aa198",
            "token": "constant.numeric.ruby"
        },
        {
            "foreground": "b58900",
            "token": "variable.other.constant.ruby"
        },
        {
            "foreground": "2aa198",
            "token": "constant.other.symbol.ruby"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.section.embedded.ruby"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.begin.ruby"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.end.ruby"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.other.special-method.ruby"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.control.import.include.php"
        },
        {
            "foreground": "839496",
            "token": "text.html.ruby meta.tag.inline.any.html"
        },
        {
            "foreground": "2aa198",
            "token": "text.html.ruby punctuation.definition.string.begin"
        },
        {
            "foreground": "2aa198",
            "token": "text.html.ruby punctuation.definition.string.end"
        },
        {
            "foreground": "839496",
            "token": "punctuation.definition.string.begin"
        },
        {
            "foreground": "839496",
            "token": "punctuation.definition.string.end"
        },
        {
            "foreground": "dc322f",
            "token": "keyword.operator.index-start.php"
        },
        {
            "foreground": "dc322f",
            "token": "keyword.operator.index-end.php"
        },
        {
            "foreground": "586e75",
            "token": "meta.array.php"
        },
        {
            "foreground": "b58900",
            "token": "meta.array.php support.function.construct.php"
        },
        {
            "foreground": "b58900",
            "token": "meta.array.empty.php support.function.construct.php"
        },
        {
            "foreground": "b58900",
            "token": "support.function.construct.php"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.array.begin"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.array.end"
        },
        {
            "foreground": "2aa198",
            "token": "constant.numeric.php"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.other.new.php"
        },
        {
            "foreground": "586e75",
            "token": "support.class.php"
        },
        {
            "foreground": "586e75",
            "token": "keyword.operator.class"
        },
        {
            "foreground": "93a1a1",
            "token": "variable.other.property.php"
        },
        {
            "foreground": "b58900",
            "token": "storage.modifier.extends.php"
        },
        {
            "foreground": "b58900",
            "token": "storage.type.class.php"
        },
        {
            "foreground": "b58900",
            "token": "keyword.operator.class.php"
        },
        {
            "foreground": "586e75",
            "token": "meta.other.inherited-class.php"
        },
        {
            "foreground": "859900",
            "token": "storage.type.php"
        },
        {
            "foreground": "93a1a1",
            "token": "entity.name.function.php"
        },
        {
            "foreground": "859900",
            "token": "support.function.construct.php"
        },
        {
            "foreground": "839496",
            "token": "entity.name.type.class.php"
        },
        {
            "foreground": "839496",
            "token": "meta.function-call.php"
        },
        {
            "foreground": "839496",
            "token": "meta.function-call.static.php"
        },
        {
            "foreground": "839496",
            "token": "meta.function-call.object.php"
        },
        {
            "foreground": "93a1a1",
            "token": "keyword.other.phpdoc"
        },
        {
            "foreground": "cb4b16",
            "token": "source.php.embedded.block.html"
        },
        {
            "foreground": "cb4b16",
            "token": "storage.type.function.php"
        },
        {
            "foreground": "2aa198",
            "token": "constant.numeric.c"
        },
        {
            "foreground": "cb4b16",
            "token": "meta.preprocessor.c.include"
        },
        {
            "foreground": "cb4b16",
            "token": "meta.preprocessor.macro.c"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.control.import.define.c"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.control.import.include.c"
        },
        {
            "foreground": "cb4b16",
            "token": "entity.name.function.preprocessor.c"
        },
        {
            "foreground": "2aa198",
            "token": "meta.preprocessor.c.include string.quoted.other.lt-gt.include.c"
        },
        {
            "foreground": "2aa198",
            "token": "meta.preprocessor.c.include punctuation.definition.string.begin.c"
        },
        {
            "foreground": "2aa198",
            "token": "meta.preprocessor.c.include punctuation.definition.string.end.c"
        },
        {
            "foreground": "586e75",
            "token": "support.function.C99.c"
        },
        {
            "foreground": "586e75",
            "token": "support.function.any-method.c"
        },
        {
            "foreground": "586e75",
            "token": "entity.name.function.c"
        },
        {
            "foreground": "2aa198",
            "token": "punctuation.definition.string.begin.c"
        },
        {
            "foreground": "2aa198",
            "token": "punctuation.definition.string.end.c"
        },
        {
            "foreground": "b58900",
            "token": "storage.type.c"
        },
        {
            "foreground": "e0eddd",
            "background": "b58900",
            "fontStyle": "italic",
            "token": "meta.diff"
        },
        {
            "foreground": "e0eddd",
            "background": "b58900",
            "fontStyle": "italic",
            "token": "meta.diff.header"
        },
        {
            "foreground": "dc322f",
            "background": "eee8d5",
            "token": "markup.deleted"
        },
        {
            "foreground": "cb4b16",
            "background": "eee8d5",
            "token": "markup.changed"
        },
        {
            "foreground": "219186",
            "background": "eee8d5",
            "token": "markup.inserted"
        },
        {
            "foreground": "e0eddd",
            "background": "a57706",
            "token": "text.html.markdown meta.dummy.line-break"
        },
        {
            "foreground": "2aa198",
            "token": "text.html.markdown markup.raw.inline"
        },
        {
            "foreground": "2aa198",
            "token": "text.restructuredtext markup.raw"
        },
        {
            "foreground": "dc322f",
            "token": "other.package.exclude"
        },
        {
            "foreground": "dc322f",
            "token": "other.remove"
        },
        {
            "foreground": "2aa198",
            "token": "other.add"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.section.group.tex"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.arguments.begin.latex"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.arguments.end.latex"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.arguments.latex"
        },
        {
            "foreground": "b58900",
            "token": "meta.group.braces.tex"
        },
        {
            "foreground": "b58900",
            "token": "string.other.math.tex"
        },
        {
            "foreground": "cb4b16",
            "token": "variable.parameter.function.latex"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.constant.math.tex"
        },
        {
            "foreground": "2aa198",
            "token": "text.tex.latex constant.other.math.tex"
        },
        {
            "foreground": "2aa198",
            "token": "constant.other.general.math.tex"
        },
        {
            "foreground": "2aa198",
            "token": "constant.other.general.math.tex"
        },
        {
            "foreground": "2aa198",
            "token": "constant.character.math.tex"
        },
        {
            "foreground": "b58900",
            "token": "string.other.math.tex"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.begin.tex"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.end.tex"
        },
        {
            "foreground": "2aa198",
            "token": "keyword.control.label.latex"
        },
        {
            "foreground": "2aa198",
            "token": "text.tex.latex constant.other.general.math.tex"
        },
        {
            "foreground": "dc322f",
            "token": "variable.parameter.definition.label.latex"
        },
        {
            "foreground": "859900",
            "token": "support.function.be.latex"
        },
        {
            "foreground": "cb4b16",
            "token": "support.function.section.latex"
        },
        {
            "foreground": "2aa198",
            "token": "support.function.general.tex"
        },
        {
            "fontStyle": "italic",
            "token": "punctuation.definition.comment.tex"
        },
        {
            "fontStyle": "italic",
            "token": "comment.line.percentage.tex"
        },
        {
            "foreground": "2aa198",
            "token": "keyword.control.ref.latex"
        },
        {
            "foreground": "586e75",
            "token": "string.quoted.double.block.python"
        },
        {
            "foreground": "859900",
            "token": "storage.type.class.python"
        },
        {
            "foreground": "859900",
            "token": "storage.type.function.python"
        },
        {
            "foreground": "859900",
            "token": "storage.modifier.global.python"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.control.import.python"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.control.import.from.python"
        },
        {
            "foreground": "b58900",
            "token": "support.type.exception.python"
        },
        {
            "foreground": "859900",
            "token": "support.function.builtin.shell"
        },
        {
            "foreground": "cb4b16",
            "token": "variable.other.normal.shell"
        },
        {
            "foreground": "268bd2",
            "token": "source.shell"
        },
        {
            "foreground": "586e75",
            "token": "meta.scope.for-in-loop.shell"
        },
        {
            "foreground": "586e75",
            "token": "variable.other.loop.shell"
        },
        {
            "foreground": "859900",
            "token": "punctuation.definition.string.end.shell"
        },
        {
            "foreground": "859900",
            "token": "punctuation.definition.string.begin.shell"
        },
        {
            "foreground": "586e75",
            "token": "meta.scope.case-block.shell"
        },
        {
            "foreground": "586e75",
            "token": "meta.scope.case-body.shell"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.logical-expression.shell"
        },
        {
            "fontStyle": "italic",
            "token": "comment.line.number-sign.shell"
        },
        {
            "foreground": "cb4b16",
            "token": "keyword.other.import.java"
        },
        {
            "foreground": "586e75",
            "token": "storage.modifier.import.java"
        },
        {
            "foreground": "b58900",
            "token": "meta.class.java storage.modifier.java"
        },
        {
            "foreground": "586e75",
            "token": "source.java comment.block"
        },
        {
            "foreground": "586e75",
            "token": "comment.block meta.documentation.tag.param.javadoc keyword.other.documentation.param.javadoc"
        },
        {
            "foreground": "b58900",
            "token": "punctuation.definition.variable.perl"
        },
        {
            "foreground": "b58900",
            "token": "variable.other.readwrite.global.perl"
        },
        {
            "foreground": "b58900",
            "token": "variable.other.predefined.perl"
        },
        {
            "foreground": "b58900",
            "token": "keyword.operator.comparison.perl"
        },
        {
            "foreground": "859900",
            "token": "support.function.perl"
        },
        {
            "foreground": "586e75",
            "fontStyle": "italic",
            "token": "comment.line.number-sign.perl"
        },
        {
            "foreground": "2aa198",
            "token": "punctuation.definition.string.begin.perl"
        },
        {
            "foreground": "2aa198",
            "token": "punctuation.definition.string.end.perl"
        },
        {
            "foreground": "dc322f",
            "token": "constant.character.escape.perl"
        },
        {
            "foreground": "268bd2",
            "token": "markup.heading.markdown"
        },
        {
            "foreground": "268bd2",
            "token": "markup.heading.1.markdown"
        },
        {
            "foreground": "268bd2",
            "token": "markup.heading.2.markdown"
        },
        {
            "foreground": "268bd2",
            "token": "markup.heading.3.markdown"
        },
        {
            "foreground": "268bd2",
            "token": "markup.heading.4.markdown"
        },
        {
            "foreground": "268bd2",
            "token": "markup.heading.5.markdown"
        },
        {
            "foreground": "268bd2",
            "token": "markup.heading.6.markdown"
        },
        {
            "foreground": "586e75",
            "fontStyle": "bold",
            "token": "markup.bold.markdown"
        },
        {
            "foreground": "586e75",
            "fontStyle": "italic",
            "token": "markup.italic.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.bold.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.italic.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.raw.markdown"
        },
        {
            "foreground": "b58900",
            "token": "markup.list.unnumbered.markdown"
        },
        {
            "foreground": "859900",
            "token": "markup.list.numbered.markdown"
        },
        {
            "foreground": "2aa198",
            "token": "markup.raw.block.markdown"
        },
        {
            "foreground": "2aa198",
            "token": "markup.raw.inline.markdown"
        },
        {
            "foreground": "6c71c4",
            "token": "markup.quote.markdown"
        },
        {
            "foreground": "6c71c4",
            "token": "punctuation.definition.blockquote.markdown"
        },
        {
            "foreground": "d33682",
            "token": "meta.separator.markdown"
        },
        {
            "foreground": "839496",
            "token": "markup.underline.link.markdown"
        },
        {
            "foreground": "839496",
            "token": "markup.underline.link.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "meta.link.inet.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "meta.link.email.lt-gt.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.begin.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.string.end.markdown"
        },
        {
            "foreground": "dc322f",
            "token": "punctuation.definition.link.markdown"
        },
        {
            "foreground": "6a8187",
            "token": "text.plain"
        },
        {
            "foreground": "eee8d5",
            "background": "eee8d5",
            "token": "sublimelinter.notes"
        },
        {
            "foreground": "93a1a1",
            "background": "93a1a1",
            "token": "sublimelinter.outline.illegal"
        },
        {
            "background": "dc322f",
            "token": "sublimelinter.underline.illegal"
        },
        {
            "foreground": "839496",
            "background": "839496",
            "token": "sublimelinter.outline.warning"
        },
        {
            "background": "b58900",
            "token": "sublimelinter.underline.warning"
        },
        {
            "foreground": "657b83",
            "background": "657b83",
            "token": "sublimelinter.outline.violation"
        },
        {
            "background": "cb4b16",
            "token": "sublimelinter.underline.violation"
        }
    ],
    "colors": {
        "editor.foreground": "#586E75",
        "editor.background": "#FDF6E3",
        "editor.selectionBackground": "#EEE8D5",
        "editor.lineHighlightBackground": "#EEE8D5",
        "editorCursor.foreground": "#000000",
        "editorWhitespace.foreground": "#EAE3C9"
    }
})
monaco.editor.defineTheme("kurior", {
    "base": "vs",
    "inherit": true,
    "rules": [
        {
            "background": "E8E9E8",
            "token": ""
        },
        {
            "foreground": "949494e8",
            "background": "dcdcdc8f",
            "token": "comment"
        },
        {
            "foreground": "#d22800",
            "background": "#ff2728",
            "token": "http.header.danger", fontStyle: "bold",
        },
        {"token": "http.method", fontStyle: "bold", foreground: "#00099a"},
        {"token": "http.path", fontStyle: "bold", foreground: "#01949a"},
        {"token": "http.get.query.params", fontStyle: "bold", foreground: "#930d97"},
        {
            "foreground": "#078500",
            "token": "http.cookie.name", fontStyle: "bold",
        },
        {
            "foreground": "#b5890a",
            "token": "http.header.mime", fontStyle: "bold",
        },
        {
            "foreground": "#808184",
            "token": "http.cookie.value",
        },
        {
            "foreground": "#808184",
            "token": "string.value", fontStyle: "bold",
        },
        {
            "foreground": "#0045e8",
            "token": "http.url", fontStyle: "underline",
        },
        {
            "foreground": "#0045e8",
            "token": "http.urlencoded", fontStyle: "",
        },
        {
            "foreground": "a54776",
            "background": "e9d6dc85",
            "token": "comment.line.region"
        },
        {
            "foreground": "668d68",
            "background": "e9e4be",
            "token": "comment.line.marker.php"
        },
        {
            "foreground": "456e48",
            "background": "d9eab8",
            "token": "comment.line.todo.php"
        },
        {
            "foreground": "880006",
            "background": "e1d0ca",
            "token": "comment.line.fixme.php"
        },
        {
            "foreground": "cd6839",
            "token": "constant"
        },
        {
            "foreground": "8b4726",
            "background": "e8e9e8",
            "token": "entity"
        },
        {
            "foreground": "a52a2a",
            "token": "storage"
        },
        {
            "foreground": "cd3700",
            "token": "keyword.control"
        },
        {
            "foreground": "b03060",
            "token": "support.function - variable"
        },
        {
            "foreground": "b03060",
            "token": "keyword.other.special-method.ruby"
        },
        {
            "foreground": "b83126",
            "token": "keyword.operator.comparison"
        },
        {
            "foreground": "b83126",
            "token": "keyword.operator.logical"
        },
        {
            "foreground": "639300",
            "token": "string"
        },
        {
            "foreground": "007e69",
            "token": "string.quoted.double.ruby source.ruby.embedded.source"
        },
        {
            "foreground": "104e8b",
            "token": "support"
        },
        {
            "foreground": "009acd",
            "token": "variable"
        },
        {
            "foreground": "fd1732",
            "background": "e8e9e8",
            "fontStyle": "italic underline",
            "token": "invalid.deprecated"
        },
        {
            "foreground": "fd1224",
            "background": "ff060026",
            "token": "invalid.illegal"
        },
        {
            "foreground": "7b211a",
            "background": "77ade900",
            "token": "text source"
        },
        {
            "foreground": "005273",
            "fontStyle": "italic",
            "token": "entity.other.inherited-class"
        },
        {
            "foreground": "417e00",
            "background": "c9d4be",
            "token": "string.regexp"
        },
        {
            "foreground": "005273",
            "token": "support.function"
        },
        {
            "foreground": "cf6a4c",
            "token": "support.constant"
        },
        {
            "fontStyle": "underline",
            "token": "entity.name.type"
        },
        {
            "foreground": "676767",
            "fontStyle": "italic",
            "token": "meta.cast"
        },
        {
            "foreground": "494949",
            "token": "meta.sgml.html meta.doctype"
        },
        {
            "foreground": "494949",
            "token": "meta.sgml.html meta.doctype entity"
        },
        {
            "foreground": "494949",
            "token": "meta.sgml.html meta.doctype string"
        },
        {
            "foreground": "494949",
            "token": "meta.xml-processing"
        },
        {
            "foreground": "494949",
            "token": "meta.xml-processing entity"
        },
        {
            "foreground": "494949",
            "token": "meta.xml-processing string"
        },
        {
            "foreground": "005273",
            "token": "meta.tag"
        },
        {
            "foreground": "005273",
            "token": "meta.tag entity"
        },
        {
            "foreground": "005273",
            "token": "source entity.name.tag"
        },
        {
            "foreground": "005273",
            "token": "source entity.other.attribute-name"
        },
        {
            "foreground": "005273",
            "token": "meta.tag.inline"
        },
        {
            "foreground": "005273",
            "token": "meta.tag.inline entity"
        },
        {
            "foreground": "b85423",
            "token": "entity.name.tag.namespace"
        },
        {
            "foreground": "b85423",
            "token": "entity.other.attribute-name.namespace"
        },
        {
            "foreground": "b83126",
            "token": "entity.name.tag.css"
        },
        {
            "foreground": "b12e25",
            "token": "meta.selector.css entity.other.attribute-name.tag.pseudo-class"
        },
        {
            "foreground": "b8002d",
            "token": "meta.selector.css entity.other.attribute-name.id"
        },
        {
            "foreground": "b8002d",
            "token": "entity.other.attribute-name.id.css"
        },
        {
            "foreground": "b8012d",
            "token": "meta.selector.css entity.other.attribute-name.class"
        },
        {
            "foreground": "b8012d",
            "token": "entity.other.attribute-name.class.css"
        },
        {
            "foreground": "005273",
            "token": "support.type.property-name.css"
        },
        {
            "foreground": "005273",
            "token": "meta.property-name"
        },
        {
            "foreground": "8693a5",
            "token": "meta.preprocessor.at-rule keyword.control.at-rule"
        },
        {
            "foreground": "417e00",
            "token": "meta.property-value"
        },
        {
            "foreground": "b8860b",
            "token": "constant.other.color"
        },
        {
            "foreground": "ee3a8c",
            "token": "keyword.other.important"
        },
        {
            "foreground": "ee3a8c",
            "token": "keyword.other.default"
        },
        {
            "foreground": "417e00",
            "token": "meta.property-value support.constant.named-color.css"
        },
        {
            "foreground": "417e00",
            "token": "meta.property-value constant"
        },
        {
            "foreground": "417e00",
            "token": "meta.constructor.argument.css"
        },
        {
            "foreground": "9a5925",
            "token": "constant.numeric"
        },
        {
            "foreground": "9f5e3d",
            "token": "keyword.other"
        },
        {
            "foreground": "1b76b0",
            "token": "source.scss support.function.misc"
        },
        {
            "foreground": "f8bebe",
            "background": "82000e",
            "fontStyle": "italic",
            "token": "meta.diff"
        },
        {
            "foreground": "f8bebe",
            "background": "82000e",
            "fontStyle": "italic",
            "token": "meta.diff.header"
        },
        {
            "foreground": "f8f8f8",
            "background": "420e09",
            "token": "markup.deleted"
        },
        {
            "foreground": "f8f8f8",
            "background": "4a410d",
            "token": "markup.changed"
        },
        {
            "foreground": "f8f8f8",
            "background": "253b22",
            "token": "markup.inserted"
        },
        {
            "foreground": "cd2626",
            "fontStyle": "italic",
            "token": "markup.italic"
        },
        {
            "foreground": "8b1a1a",
            "fontStyle": "bold",
            "token": "markup.bold"
        },
        {
            "foreground": "e18964",
            "fontStyle": "underline",
            "token": "markup.underline"
        },
        {
            "foreground": "8b7765",
            "background": "fee09c12",
            "fontStyle": "italic",
            "token": "markup.quote"
        },
        {
            "foreground": "b8012d",
            "background": "bf61330d",
            "token": "markup.heading"
        },
        {
            "foreground": "b8012d",
            "background": "bf61330d",
            "token": "markup.heading entity"
        },
        {
            "foreground": "8f5b26",
            "token": "markup.list"
        },
        {
            "foreground": "578bb3",
            "background": "b1b3ba08",
            "token": "markup.raw"
        },
        {
            "foreground": "f67b37",
            "fontStyle": "italic",
            "token": "markup comment"
        },
        {
            "foreground": "60a633",
            "background": "242424",
            "token": "meta.separator"
        },
        {
            "foreground": "578bb3",
            "background": "b1b3ba08",
            "token": "markup.other"
        },
        {
            "background": "eeeeee29",
            "token": "meta.line.entry.logfile"
        },
        {
            "background": "eeeeee29",
            "token": "meta.line.exit.logfile"
        },
        {
            "background": "751012",
            "token": "meta.line.error.logfile"
        },
        {
            "background": "dcdcdc8f",
            "token": "punctuation.definition.end"
        },
        {
            "foreground": "629f9e",
            "token": "entity.other.attribute-name.html"
        },
        {
            "foreground": "79a316",
            "token": "string.quoted.double.js"
        },
        {
            "foreground": "79a316",
            "token": "string.quoted.single.js"
        },
        {
            "foreground": "488c45",
            "fontStyle": "italic",
            "token": "entity.name.function.js"
        },
        {
            "foreground": "666666",
            "token": "source.js.embedded.html"
        },
        {
            "foreground": "bb3182",
            "token": "storage.type.js"
        },
        {
            "foreground": "338fd5",
            "token": "support.class.js"
        },
        {
            "foreground": "a99904",
            "fontStyle": "italic",
            "token": "keyword.control.js"
        },
        {
            "foreground": "a99904",
            "fontStyle": "italic",
            "token": "keyword.operator.js"
        },
        {
            "foreground": "616838",
            "background": "d7d7a7",
            "token": "entity.name.class"
        },
        {
            "background": "968f96",
            "token": "active_guide"
        },
        {
            "background": "cbdc2f38",
            "token": "highlight_matching_word"
        }
    ],
    "colors": {
        "editor.foreground": "#363636",
        "editor.background": "#E8E9E8",
        "editor.selectionBackground": "#F5AA0091",
        "editor.lineHighlightBackground": "#CBDC2F38",
        "editorCursor.foreground": "#202020",
        "editorWhitespace.foreground": "#0000004A",
        "editorIndentGuide.background": "#8F8F8F",
        "editorIndentGuide.activeBackground": "#FA2828"
    }
})
monaco.editor.defineTheme("LAZY", {
    "base": "vs",
    "inherit": true,
    "rules": [
        {
            "background": "FFFFFF",
            "token": ""
        },
        {
            "foreground": "8c868f",
            "token": "comment"
        },
        {
            "foreground": "3b5bb5",
            "token": "constant"
        },
        {
            "foreground": "3b5bb5",
            "token": "entity"
        },
        {
            "foreground": "d62a28",
            "token": "text.tex.latex entity"
        },
        {
            "foreground": "ff7800",
            "token": "keyword"
        },
        {
            "foreground": "ff7800",
            "token": "storage"
        },
        {
            "foreground": "409b1c",
            "token": "string"
        },
        {
            "foreground": "409b1c",
            "token": "meta.verbatim"
        },
        {
            "foreground": "3b5bb5",
            "token": "support"
        },
        {
            "foreground": "990000",
            "fontStyle": "italic",
            "token": "invalid.deprecated"
        },
        {
            "foreground": "f8f8f8",
            "background": "9d1e15",
            "token": "invalid.illegal"
        },
        {
            "foreground": "3b5bb5",
            "fontStyle": "italic",
            "token": "entity.other.inherited-class"
        },
        {
            "foreground": "671ebb",
            "token": "string constant.other.placeholder"
        },
        {
            "foreground": "3e4558",
            "token": "meta.function-call.py"
        },
        {
            "foreground": "3a4a64",
            "token": "meta.tag"
        },
        {
            "foreground": "3a4a64",
            "token": "meta.tag entity"
        },
        {
            "foreground": "7f90aa",
            "token": "keyword.type.variant"
        },
        {
            "foreground": "000000",
            "token": "source.ocaml keyword.operator"
        },
        {
            "foreground": "3b5bb5",
            "token": "source.ocaml keyword.operator.symbol.infix"
        },
        {
            "foreground": "3b5bb5",
            "token": "source.ocaml keyword.operator.symbol.prefix"
        },
        {
            "fontStyle": "underline",
            "token": "source.ocaml keyword.operator.symbol.infix.floating-point"
        },
        {
            "fontStyle": "underline",
            "token": "source.ocaml keyword.operator.symbol.prefix.floating-point"
        },
        {
            "fontStyle": "underline",
            "token": "source.ocaml constant.numeric.floating-point"
        }
    ],
    "colors": {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
        "editor.selectionBackground": "#E3FC8D",
        "editor.lineHighlightBackground": "#EFFCA68F",
        "editorCursor.foreground": "#7C7C7C",
        "editorWhitespace.foreground": "#B6B6B6"
    }
})
monaco.editor.defineTheme("idleFingers", {
    "base": "vs-dark",
    "inherit": true,
    "rules": [
        {
            "background": "323232",
            "token": ""
        },
        {
            "foreground": "ffffff",
            "token": "text"
        },
        {
            "foreground": "cdcdcd",
            "background": "282828",
            "token": "source"
        },
        {
            "foreground": "bc9458",
            "fontStyle": "italic",
            "token": "comment"
        },
        {
            "foreground": "ffe5bb",
            "token": "meta.tag"
        },
        {
            "foreground": "ffe5bb",
            "token": "declaration.tag"
        },
        {
            "foreground": "ffe5bb",
            "token": "meta.doctype"
        },
        {
            "foreground": "ffc66d",
            "token": "entity.name"
        },
        {
            "foreground": "fff980",
            "token": "source.ruby entity.name"
        },
        {
            "foreground": "b7dff8",
            "token": "variable.other"
        },
        {
            "foreground": "cccc33",
            "token": "support.class.ruby"
        },
        {
            "foreground": "6c99bb",
            "token": "constant"
        },
        {
            "foreground": "6c99bb",
            "token": "support.constant"
        },
        {
            "foreground": "cc7833",
            "token": "keyword"
        },
        {
            "foreground": "d0d0ff",
            "token": "other.preprocessor.c"
        },
        {
            "fontStyle": "italic",
            "token": "variable.parameter"
        },
        {
            "foreground": "ffffff",
            "background": "575757",
            "token": "source comment.block"
        },
        {
            "foreground": "a5c261",
            "token": "string"
        },
        {
            "foreground": "aaaaaa",
            "token": "string constant.character.escape"
        },
        {
            "foreground": "000000",
            "background": "cccc33",
            "token": "string.interpolated"
        },
        {
            "foreground": "cccc33",
            "token": "string.regexp"
        },
        {
            "foreground": "cccc33",
            "token": "string.literal"
        },
        {
            "foreground": "787878",
            "token": "string.interpolated constant.character.escape"
        },
        {
            "fontStyle": "underline",
            "token": "entity.name.class"
        },
        {
            "fontStyle": "italic underline",
            "token": "entity.other.inherited-class"
        },
        {
            "foreground": "b83426",
            "token": "support.function"
        },
        {
            "foreground": "6ea533",
            "token": "markup.list.unnumbered.textile"
        },
        {
            "foreground": "6ea533",
            "token": "markup.list.numbered.textile"
        },
        {
            "foreground": "c2c2c2",
            "fontStyle": "bold",
            "token": "markup.bold.textile"
        },
        {
            "foreground": "ffffff",
            "background": "ff0000",
            "token": "invalid"
        },
        {
            "foreground": "323232",
            "background": "fff980",
            "token": "collab.user1"
        }
    ],
    "colors": {
        "editor.foreground": "#FFFFFF",
        "editor.background": "#323232",
        "editor.selectionBackground": "#5A647EE0",
        "editor.lineHighlightBackground": "#353637",
        "editorCursor.foreground": "#91FF00",
        "editorWhitespace.foreground": "#404040"
    }
})
// @ts-ignore
monaco.editor.defineTheme("fuzz-http", {
    base: "vs", inherit: true,
    rules: [
        {token: "header", foreground: "#38ecf1"},
        {token: "fuzzTemplate", background: "#24c15e", foreground: "#cd8d3c", fontStyle: "bold"},
        {token: "httpMethod", foreground: "#95cd3c", fontStyle: "bold"},
        {token: "keywords", foreground: "#fcb312"},
        {token: "high-risk", foreground: "#ff310f"},
        {token: "params", foreground: "#2f74d0"}
    ],
})