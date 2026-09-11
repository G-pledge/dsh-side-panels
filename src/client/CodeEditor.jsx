import React, { useEffect, useRef } from 'react'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { xml } from '@codemirror/lang-xml'
import {
  bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap,
  indentOnInput, syntaxHighlighting,
} from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import {
  EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers,
} from '@codemirror/view'
import { extOf } from './icons.jsx'

function languageFor(path) {
  const ext = extOf(basename(path))
  if (ext === 'ts') return javascript({ typescript: true })
  if (ext === 'tsx') return javascript({ typescript: true, jsx: true })
  if (ext === 'jsx') return javascript({ jsx: true })
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return javascript()
  if (ext === 'json') return json()
  if (ext === 'html' || ext === 'htm') return html()
  if (ext === 'css') return css()
  if (ext === 'md' || ext === 'markdown') return markdown()
  if (ext === 'xml' || ext === 'svg') return xml()
  return []
}

function basename(path) {
  const parts = String(path).split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'var(--dsw-alias-fg-default, #3c3c3c)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    lineHeight: '1.5',
  },
  '.cm-gutters': {
    background: 'var(--dsw-alias-bg-base, #fff)',
    borderRight: '1px solid var(--dsw-alias-border, #ececec)',
    color: '#9a9a9a',
  },
  '.cm-activeLineGutter': {
    background: 'transparent',
  },
  '&.cm-focused': {
    outline: 'none',
  },
})

export function CodeEditor({ path, text, onChange, onSave, readOnly }) {
  const parentRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  onChangeRef.current = onChange
  onSaveRef.current = onSave

  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return undefined
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: text ?? '',
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          foldGutter(),
          ...(readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [history()]),
          indentOnInput(),
          bracketMatching(),
          highlightSelectionMatches(),
          search(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          languageFor(path),
          keymap.of([
            ...(readOnly ? [] : [{ key: 'Mod-s', preventDefault: true, run: () => { void onSaveRef.current?.(); return true } }]),
            ...searchKeymap,
            ...(readOnly ? [] : historyKeymap),
            ...foldKeymap,
            indentWithTab,
            ...defaultKeymap,
          ]),
          theme,
          EditorView.updateListener.of((update) => {
            if (!readOnly && update.docChanged) onChangeRef.current?.(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    if (!readOnly) queueMicrotask(() => view.focus())
    return () => {
      viewRef.current = null
      view.destroy()
    }
  }, [path, readOnly, readOnly ? text : null])

  useEffect(() => {
    if (readOnly) return
    const view = viewRef.current
    if (!view) return
    const next = text ?? ''
    if (view.state.doc.toString() === next) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next },
      filter: false,
    })
  }, [text, readOnly])

  return <div ref={parentRef} data-dsh-cm="" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} />
}
