export const S = {
  panel: {
    position: 'absolute',
    insetBlock: 0,
    insetInlineEnd: 0,
    zIndex: 40,
    display: 'grid',
    gridTemplateRows: '35px minmax(0, 1fr)',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'var(--dsw-alias-fg-default, #3c3c3c)',
    borderInlineStart: '1px solid var(--dsw-alias-border, #e5e5e5)',
    fontSize: 13,
    lineHeight: 1.4,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  pane: {
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--dsw-alias-bg-base, #fff)',
  },
  chrome: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    minHeight: 35,
    padding: '0 8px 0 4px',
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    flex: '0 0 35px',
    position: 'relative',
    zIndex: 8,
    gap: 4,
    minWidth: 0,
  },
  chromeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flex: '0 0 auto',
  },
  filesBar: {
    display: 'flex',
    alignItems: 'stretch',
    minWidth: 0,
    minHeight: 35,
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    background: 'var(--dsw-alias-bg-subtle, #f3f3f3)',
    overflow: 'visible',
    zIndex: 20,
  },
  filesBarMain: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
    flex: 1,
    padding: '0 6px 0 8px',
    gap: 4,
  },
  filesBarLeft: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    flex: 1,
    gap: 4,
    overflow: 'visible',
  },
  filesPills: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    flex: 1,
    gap: 4,
    overflowX: 'auto',
  },
  filesPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    background: 'rgb(0 0 0 / 7%)',
    color: 'inherit',
    borderRadius: 999,
    padding: '4px 6px 4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flex: '0 0 auto',
    lineHeight: 1.2,
    opacity: 1,
  },
  filesPillIdle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    borderRadius: 999,
    padding: '4px 6px 4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flex: '0 0 auto',
    lineHeight: 1.2,
    opacity: 0.72,
  },
  paneClose: {
    width: 16,
    height: 16,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    opacity: 0.5,
    flex: '0 0 16px',
  },
  filesTabs: {
    display: 'flex',
    alignItems: 'stretch',
    minWidth: 0,
    flex: 1,
    overflowX: 'auto',
  },
  tree: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    background: 'var(--dsw-alias-bg-subtle, #f3f3f3)',
    borderInlineStart: '1px solid var(--dsw-alias-border, #e8e8e8)',
  },
  rail: {
    width: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0',
    gap: 4,
    background: 'var(--dsw-alias-bg-muted, #ececec)',
    borderInlineStart: '1px solid var(--dsw-alias-border, #e0e0e0)',
    color: 'var(--dsw-alias-fg-muted, #5a5a5a)',
  },
  railBtn: {
    width: 40,
    height: 40,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    opacity: 0.72,
  },
  railBtnActive: {
    background: 'rgb(90 90 90 / 18%)',
    color: 'var(--dsw-alias-fg-default, #2f2f2f)',
    opacity: 1,
  },
  tabs: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
    minHeight: 35,
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    background: 'var(--dsw-alias-bg-subtle, #f3f3f3)',
    overflowX: 'auto',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    borderRight: '1px solid var(--dsw-alias-border, #ececec)',
    background: 'transparent',
    color: 'inherit',
    padding: '0 8px 0 12px',
    fontSize: 13,
    maxWidth: 200,
    height: 34,
  },
  tabActive: {
    background: 'var(--dsw-alias-bg-base, #fff)',
  },
  tabName: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    padding: 0,
    fontSize: 13,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 150,
  },
  tabClose: {
    width: 18,
    height: 18,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
    flex: '0 0 18px',
    padding: 0,
  },
  dirtyDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    background: 'currentColor',
    opacity: 0.55,
    flex: '0 0 7px',
  },
  grip: {
    position: 'absolute',
    insetBlock: 0,
    width: 4,
    zIndex: 6,
    cursor: 'ew-resize',
    background: 'transparent',
    border: 'none',
    padding: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 8px 8px 16px',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.04em',
    textTransform: 'none',
  },
  iconBtn: {
    width: 26,
    height: 26,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  empty: {
    margin: 'auto',
    textAlign: 'center',
    color: 'var(--dsw-alias-fg-muted, #6f6f6f)',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 13,
    marginBottom: 14,
    opacity: 0.9,
  },
  newFile: {
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  previewWrap: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'var(--dsw-alias-bg-subtle, #f6f6f6)',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    boxShadow: '0 4px 18px rgb(0 0 0 / 12%)',
  },
  mediaPane: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  termWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--dsw-alias-bg-base, #fff)',
  },
  termHost: {
    position: 'absolute',
    inset: '8px 10px',
    overflow: 'hidden',
  },
  previewBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    flex: '0 0 auto',
  },
  modeBtn: {
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  banner: {
    padding: '6px 12px',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-muted, #6f6f6f)',
    background: 'var(--dsw-alias-bg-subtle, #f6f6f6)',
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
  },
  hex: {
    margin: 0,
    padding: '12px 16px',
    overflow: 'auto',
    flex: 1,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12,
    lineHeight: 1.45,
    whiteSpace: 'pre',
  },
  pre: {
    margin: 0,
    padding: '12px 16px',
    overflow: 'auto',
    flex: 1,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 13,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'start',
    padding: '3px 10px 3px 2px',
    cursor: 'pointer',
    fontSize: 13,
    borderRadius: 0,
    minHeight: 22,
  },
  git: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: 700,
    width: 14,
    textAlign: 'center',
    flex: '0 0 14px',
  },
  search: {
    margin: '0 8px 8px',
    fontSize: 12,
    padding: '4px 8px',
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    borderRadius: 4,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    outline: 'none',
  },
  notice: {
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-danger, #b42318)',
  },
  createRow: {
    display: 'flex',
    gap: 4,
    padding: '4px 8px 8px',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    padding: '3px 6px',
    border: '1px solid var(--dsw-alias-border, #ccc)',
    borderRadius: 4,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    zIndex: 80,
    minWidth: 220,
    padding: '6px 0',
    marginTop: 4,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'var(--dsw-alias-fg-default, #3c3c3c)',
    border: '1px solid var(--dsw-alias-border, #e5e5e5)',
    borderRadius: 10,
    boxShadow: '0 8px 28px rgb(0 0 0 / 14%)',
  },
  submenu: {
    position: 'absolute',
    right: '100%',
    top: 0,
    zIndex: 81,
    minWidth: 168,
    marginRight: 6,
    padding: '6px 0',
    background: 'var(--dsw-alias-bg-base, #fff)',
    border: '1px solid var(--dsw-alias-border, #e5e5e5)',
    borderRadius: 10,
    boxShadow: '0 8px 28px rgb(0 0 0 / 14%)',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'start',
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 0,
  },
  menuLabel: {
    flex: 1,
  },
  menuChevron: {
    marginLeft: 'auto',
    opacity: 0.4,
    fontSize: 16,
    lineHeight: 1,
  },
  menuSep: {
    height: 1,
    background: 'var(--dsw-alias-border, #ececec)',
    margin: '4px 8px',
  },
  addMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 'auto',
    zIndex: 90,
    width: 280,
    padding: '8px 0 6px',
    marginTop: 4,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'var(--dsw-alias-fg-default, #3c3c3c)',
    border: '1px solid var(--dsw-alias-border, #e5e5e5)',
    borderRadius: 10,
    boxShadow: '0 8px 28px rgb(0 0 0 / 14%)',
  },
  addMenuSearch: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 10px 6px',
    padding: '6px 8px',
    border: '1px solid var(--dsw-alias-border, #e5e5e5)',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-subtle, #f7f7f7)',
  },
  addMenuSearchInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    fontSize: 13,
    outline: 'none',
    padding: 0,
  },
  addMenuKbd: {
    marginLeft: 'auto',
    fontSize: 11,
    opacity: 0.45,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    flex: '0 0 auto',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    gridColumn: '1 / -1',
    gridRow: '1 / -1',
    zIndex: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'rgb(0 0 0 / 28%)',
  },
  dialog: {
    width: 320,
    maxWidth: '100%',
    padding: '16px 18px 14px',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'var(--dsw-alias-fg-default, #3c3c3c)',
    border: '1px solid var(--dsw-alias-border, #e5e5e5)',
    borderRadius: 12,
    boxShadow: '0 12px 40px rgb(0 0 0 / 18%)',
  },
  dialogTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
  },
  dialogHint: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 12,
  },
  dialogInput: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: 13,
    padding: '8px 10px',
    border: '1px solid var(--dsw-alias-border, #ccc)',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    outline: 'none',
  },
  dialogError: {
    marginTop: 8,
    fontSize: 12,
    color: 'var(--dsw-alias-fg-danger, #b42318)',
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  dialogBtn: {
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    background: 'transparent',
    color: 'inherit',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
  dialogBtnPrimary: {
    border: 'none',
    background: 'var(--dsw-alias-interactive-bg, #0d6efd)',
    color: '#fff',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
}

export const OPEN_STYLE = `
[data-pane="conversation"],
[class*="centerCol"] {
  position: relative;
}
html[data-dsh-side-panels-open] [data-pane="conversation"],
html[data-dsh-side-panels-open] [class*="centerCol"] {
  padding-inline-end: var(--dsh-side-panels-width, 808px);
}
html[data-dsh-side-panels-dragging] {
  cursor: ew-resize !important;
  user-select: none !important;
}
html[data-dsh-side-panels-dragging] * {
  cursor: ew-resize !important;
  user-select: none !important;
}
[data-dsh-side-panels] [data-dsh-grip]:hover,
html[data-dsh-side-panels-dragging] [data-dsh-grip] {
  background: rgb(0 122 204 / 45%) !important;
}
[data-dsh-side-panels-toggle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border: 1px solid var(--dsw-alias-border, #e5e5e5);
  background: var(--dsw-alias-bg-base, #fff);
  color: var(--dsw-alias-fg-default, #3c3c3c);
  cursor: pointer;
  border-radius: 6px;
}
[data-dsh-side-panels-toggle]:hover {
  background: var(--dsw-alias-bg-subtle, #f3f3f3);
}
[data-dsh-side-panels] button:hover:not(:disabled) {
  background: rgb(127 127 127 / 12%) !important;
}
[data-dsh-side-panels] [data-dsh-dialog] button:hover:not(:disabled) {
  background: rgb(127 127 127 / 10%) !important;
}
[data-dsh-side-panels] [data-dsh-dialog-ok]:hover:not(:disabled) {
  background: #0b5ed7 !important;
  color: #fff !important;
}
[data-dsh-side-panels] button[data-dsh-pane-pill] {
  background: transparent !important;
}
[data-dsh-side-panels] button[data-dsh-pane-pill]:hover:not(:disabled) {
  background: rgb(127 127 127 / 10%) !important;
  opacity: 1;
}
[data-dsh-side-panels] button[data-dsh-files-pill] {
  background: rgb(0 0 0 / 7%) !important;
  opacity: 1;
}
[data-dsh-side-panels] button[data-dsh-files-pill]:hover:not(:disabled) {
  background: rgb(0 0 0 / 12%) !important;
}
[data-dsh-side-panels] button:disabled {
  opacity: 0.28;
  cursor: default;
}
[data-dsh-side-panels] [data-dsh-rail] button {
  opacity: 0.72;
}
[data-dsh-side-panels] [data-dsh-rail] button:hover:not(:disabled) {
  background: rgb(90 90 90 / 14%) !important;
  opacity: 1;
}
[data-dsh-side-panels] [data-dsh-rail] button[aria-pressed="true"] {
  background: rgb(90 90 90 / 18%) !important;
  opacity: 1;
  color: var(--dsw-alias-fg-default, #2f2f2f);
}
[data-dsh-side-panels] [role="menu"] button:hover:not(:disabled) {
  background: rgb(127 127 127 / 10%) !important;
}
[data-dsh-cm],
[data-dsh-cm] .cm-editor {
  height: 100%;
}
[data-dsh-cm] .cm-editor.cm-focused {
  outline: none;
}
`

export const SETTINGS_STYLE = `
[data-dsh-settings-page] {
  max-width: 640px;
  color: var(--dsw-alias-label-primary);
}
[data-dsh-settings-page] .dsh-sp-lede {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-tertiary);
}
[data-dsh-settings-page] .dsh-sp-row,
[data-dsh-settings-page] .dsh-sp-group {
  display: flex;
  gap: 8px;
  padding: 16px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
[data-dsh-settings-page] .dsh-sp-row {
  align-items: center;
}
[data-dsh-settings-page] .dsh-sp-group {
  flex-direction: column;
}
[data-dsh-settings-page] .dsh-sp-copy {
  min-width: 0;
  flex: 1;
}
[data-dsh-settings-page] .dsh-sp-title {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}
[data-dsh-settings-page] .dsh-sp-hint {
  margin-top: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
[data-dsh-settings-page] .dsh-sp-switch {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  width: 40px;
  height: 22px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 99px;
  background: var(--dsw-alias-fill-secondary, #d0d0d0);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 6%);
  cursor: pointer;
  position: relative;
}
[data-dsh-settings-page] .dsh-sp-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 99px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 18%);
  transition: transform .16s ease;
}
[data-dsh-settings-page] .dsh-sp-switch[data-on="true"] {
  background: var(--dsw-alias-brand-primary, #1677ff);
}
[data-dsh-settings-page] .dsh-sp-switch[data-on="true"]::after {
  transform: translateX(18px);
}
[data-dsh-settings-page] .dsh-sp-select {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  width: 168px;
  height: 32px;
  padding: 0 28px 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background-color: var(--dsw-alias-bg-layer-2, #fff);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='%23888' d='M3 4.5 6 8l3-3.5'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 32px;
  outline: none;
  cursor: pointer;
}
[data-dsh-settings-page] .dsh-sp-select:hover,
[data-dsh-settings-page] .dsh-sp-path:hover {
  border-color: var(--dsw-alias-label-dimmed, #bbb);
}
[data-dsh-settings-page] .dsh-sp-path {
  display: block;
  width: 100%;
  box-sizing: border-box;
  height: 32px;
  margin-top: 8px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #fff);
  color: inherit;
  font: inherit;
  font-size: 13px;
  outline: none;
}
[data-dsh-settings-page] .dsh-sp-cubes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
[data-dsh-settings-page] .dsh-sp-cube {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  flex: 1 1 160px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 18px 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 16px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;
  outline: none;
  box-shadow: none;
}
[data-dsh-settings-page] .dsh-sp-cube:hover:not([aria-checked="true"]) {
  background: var(--dsw-alias-interactive-bg-hover);
}
[data-dsh-settings-page] .dsh-sp-cube[aria-checked="true"] {
  background: var(--dsw-alias-bg-module-platform);
  border-color: var(--dsw-static-neutral-bluish-400, #8aa4c8);
}
[data-dsh-settings-page] .dsh-sp-cube small {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  font-weight: 400;
}
`
