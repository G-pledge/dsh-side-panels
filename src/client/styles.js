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
    overflow: 'visible',
  },
  chromeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flex: '0 0 auto',
    overflow: 'visible',
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
    alignItems: 'center',
    minWidth: 0,
    minHeight: 0,
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
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
    background: 'transparent',
    color: 'inherit',
    padding: '0 8px 0 10px',
    fontSize: 13,
    height: 26,
    margin: '0 2px',
    borderRadius: 8,
    opacity: 0.72,
    flex: '0 0 auto',
  },
  tabActive: {
    background: 'rgb(0 122 204 / 14%)',
    opacity: 1,
  },
  tabName: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    padding: 0,
    fontSize: 13,
    whiteSpace: 'nowrap',
    flex: '0 0 auto',
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
  browserWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--dsw-alias-bg-base, #fff)',
  },
  browserUrlForm: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px',
  },
  browserUrl: {
    width: '100%',
    height: 24,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 12,
    background: 'var(--dsw-alias-bg-subtle, #f3f3f3)',
    color: 'inherit',
    outline: 'none',
  },
  browserStage: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    background: '#fff',
    outline: 'none',
  },
  browserBody: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  browserPopupMask: {
    position: 'absolute',
    inset: 0,
    zIndex: 25,
  },
  browserDock: {
    flex: '0 0 42%',
    minHeight: 160,
    borderTop: '1px solid #3c4043',
    background: '#202124',
    position: 'relative',
    overflow: 'hidden',
  },
  browserLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    background: 'rgb(0 122 204 / 70%)',
    zIndex: 3,
    pointerEvents: 'none',
  },
  browserError: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgb(0 0 0 / 72%)',
    color: '#fff',
    fontSize: 12,
    zIndex: 2,
  },
  browserTabBar: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '2px 6px 0',
    gap: 2,
    overflowX: 'auto',
    overflowY: 'hidden',
    background: 'var(--dsw-alias-bg-subtle, #f3f3f3)',
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    flex: '0 0 auto',
  },
  browserTab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: 180,
    height: 24,
    padding: '0 4px 0 6px',
    borderRadius: '8px 8px 0 0',
    fontSize: 12,
    cursor: 'pointer',
    opacity: 0.7,
    flex: '0 0 auto',
  },
  browserTabActive: {
    background: 'var(--dsw-alias-bg-base, #fff)',
    opacity: 1,
  },
  browserTabIcon: {
    width: 14,
    height: 14,
    flex: '0 0 14px',
    borderRadius: 2,
    objectFit: 'contain',
    background: 'transparent',
  },
  browserTabIconFallback: {
    width: 14,
    height: 14,
    flex: '0 0 14px',
    opacity: 0.45,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  browserTabName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  browserTabAdd: {
    width: 24,
    height: 24,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    flex: '0 0 24px',
    opacity: 0.7,
  },
  browserDlWrap: {
    position: 'relative',
    flex: '0 0 auto',
  },
  browserDownloads: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    width: 320,
    maxWidth: 'min(320px, 72vw)',
    maxHeight: 260,
    overflowY: 'auto',
    zIndex: 40,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, #fff)',
    boxShadow: '0 8px 28px rgb(0 0 0 / 18%)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  browserMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    minWidth: 168,
    zIndex: 40,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, #fff)',
    boxShadow: '0 8px 28px rgb(0 0 0 / 18%)',
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
  },
  browserMenuItem: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    fontSize: 12,
    lineHeight: '22px',
    padding: '4px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  browserHistory: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    width: 320,
    maxWidth: 'min(320px, 72vw)',
    maxHeight: 320,
    overflowY: 'auto',
    zIndex: 40,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, #fff)',
    boxShadow: '0 8px 28px rgb(0 0 0 / 18%)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  browserHistoryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
    borderRadius: 6,
  },
  browserHistoryItem: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    padding: '6px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
    flex: 1,
  },
  browserHistoryTitle: {
    fontSize: 12,
    lineHeight: '18px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  browserHistoryMeta: {
    fontSize: 11,
    lineHeight: '16px',
    opacity: 0.55,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
  },
  browserHistoryHost: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  browserProxy: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    width: 360,
    maxWidth: 'min(360px, 78vw)',
    maxHeight: 420,
    overflowY: 'auto',
    zIndex: 40,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, #fff)',
    boxShadow: '0 8px 28px rgb(0 0 0 / 18%)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  browserProxyHead: {
    fontSize: 13,
    fontWeight: 600,
    padding: '0 2px 4px',
  },
  browserProxyRow: {
    border: '1px solid transparent',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  browserProxyRowOn: {
    background: 'rgba(0, 122, 204, 0.1)',
    border: '1px solid rgba(0, 122, 204, 0.42)',
  },
  browserProxyCustom: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
    border: '1px solid transparent',
    borderRadius: 8,
    padding: '0 4px 0 0',
  },
  browserProxyPick: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    padding: '8px 8px 8px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  browserProxyName: {
    fontSize: 13,
    lineHeight: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  browserProxyMeta: {
    fontSize: 11,
    lineHeight: '16px',
    opacity: 0.55,
    flex: '0 0 auto',
    whiteSpace: 'nowrap',
  },
  browserProxyDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    background: '#3ba55d',
    flex: '0 0 7px',
  },
  browserProxyIconBtn: {
    width: 22,
    height: 22,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 22px',
    padding: 0,
  },
  browserProxyForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingTop: 6,
    borderTop: '1px solid var(--dsw-alias-border, #ececec)',
  },
  browserProxyFields: {
    display: 'flex',
    gap: 6,
    minWidth: 0,
  },
  browserProxyInput: {
    flex: 1,
    minWidth: 0,
    height: 28,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 6,
    padding: '0 8px',
    fontSize: 12,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    outline: 'none',
  },
  browserProxySelect: {
    flex: '0 0 88px',
    height: 28,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 6,
    padding: '0 6px',
    fontSize: 12,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    outline: 'none',
  },
  browserProxyPort: {
    flex: '0 0 88px',
    height: 28,
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 6,
    padding: '0 8px',
    fontSize: 12,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    outline: 'none',
  },
  browserProxyBypass: {
    width: '100%',
    minHeight: 58,
    resize: 'vertical',
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 12,
    lineHeight: '18px',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  browserProxyHint: {
    fontSize: 12,
    color: '#c43c3c',
  },
  browserProxyActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  browserProxyAdd: {
    border: 'none',
    background: 'rgb(0 122 204)',
    color: '#fff',
    fontSize: 12,
    lineHeight: '22px',
    padding: '3px 14px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  browserDlBar: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  browserDlEmpty: {
    fontSize: 12,
    opacity: 0.65,
    padding: '4px 2px',
  },
  browserDlBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 99,
    background: 'rgb(0 122 204)',
    pointerEvents: 'none',
  },
  browserDlItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) auto',
    gridTemplateRows: 'auto auto',
    columnGap: 8,
    rowGap: 4,
    alignItems: 'center',
  },
  browserDlMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    gridColumn: '1 / 2',
  },
  browserDlName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 12,
  },
  browserDlPct: {
    fontSize: 11,
    opacity: 0.65,
    flex: '0 0 auto',
  },
  browserDlTrack: {
    gridColumn: '1 / 2',
    height: 4,
    borderRadius: 99,
    background: 'rgb(0 0 0 / 10%)',
    overflow: 'hidden',
  },
  browserDlFill: {
    height: '100%',
    background: 'rgb(0 122 204 / 80%)',
    borderRadius: 99,
  },
  browserDlActions: {
    gridColumn: '2 / 3',
    gridRow: '1 / 3',
    display: 'flex',
    gap: 4,
  },
  browserDlBtn: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    fontSize: 11,
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
    opacity: 0.75,
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
  gitScm: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    background: 'transparent',
  },
  gitHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 8px 8px 16px',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.04em',
    flex: '0 0 auto',
  },
  gitHeadTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  gitRepo: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    padding: '2px 8px 6px 8px',
    flex: '0 0 auto',
  },
  gitRepoBlock: {
    paddingBottom: 10,
    marginBottom: 8,
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
  },
  gitRepoBody: {
    marginLeft: 16,
    paddingLeft: 8,
    borderLeft: '1px solid color-mix(in srgb, var(--dsw-alias-fg-default, #3c3c3c) 40%, transparent)',
    minWidth: 0,
  },
  gitRepoName: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: '0 1 auto',
    minWidth: 0,
  },
  gitHeadBranch: {
    fontSize: 12,
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: '1 1 0',
    minWidth: 0,
    textAlign: 'start',
  },
  gitBranchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    flex: '1 1 0',
    margin: 0,
    padding: '2px 4px',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 4,
  },
  gitCommitRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
    margin: '0 10px 8px',
    minWidth: 0,
  },
  gitMessage: {
    flex: '0 0 auto',
    width: '100%',
    minWidth: 0,
    minHeight: 28,
    maxHeight: 140,
    height: 28,
    margin: 0,
    font: 'inherit',
    fontSize: 13,
    lineHeight: '20px',
    padding: '3px 8px',
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    borderRadius: 2,
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'none',
    overflowX: 'hidden',
    overflowY: 'hidden',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
  gitCommitSplit: {
    display: 'flex',
    width: '100%',
    height: 28,
    margin: 0,
    borderRadius: 2,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  gitCommit: {
    flex: '1 1 auto',
    width: 'auto',
    minWidth: 0,
    maxHeight: 28,
    alignSelf: 'stretch',
    margin: 0,
    height: 28,
    border: 'none',
    borderRadius: 0,
    padding: '0 10px',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#fff',
    background: 'var(--dsw-alias-primary, #0078d4)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },
  gitCommitCaret: {
    flex: 'none',
    width: 28,
    height: 28,
    margin: 0,
    padding: 0,
    border: 'none',
    borderLeft: '1px solid rgb(255 255 255 / 82%)',
    borderRadius: 0,
    background: 'var(--dsw-alias-primary, #0078d4)',
    color: '#fff',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gitError: {
    margin: '0 10px 8px',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-danger, #b42318)',
  },
  gitLists: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  },
  gitSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px 4px 8px',
    minHeight: 22,
    fontSize: 13,
    fontWeight: 600,
    color: 'inherit',
  },
  gitSectionTree: {
    marginLeft: 16,
    paddingLeft: 8,
    borderLeft: '1px solid color-mix(in srgb, var(--dsw-alias-fg-default, #3c3c3c) 40%, transparent)',
    minWidth: 0,
  },
  gitTwist: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    flex: 1,
    margin: 0,
    padding: '0 2px',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontWeight: 600,
    fontSize: 13,
    textAlign: 'start',
    cursor: 'pointer',
    borderRadius: 0,
  },
  gitBadge: {
    minWidth: 18,
    height: 16,
    padding: '0 5px',
    marginLeft: 6,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: '16px',
    textAlign: 'center',
    background: 'rgb(127 127 127 / 18%)',
    flex: '0 0 auto',
  },
  gitSectionActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    flex: '0 0 auto',
    opacity: 0,
    pointerEvents: 'none',
  },
  gitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '2px 8px 2px 10px',
    minHeight: 22,
    cursor: 'pointer',
    boxSizing: 'border-box',
    position: 'relative',
  },
  gitRowActive: {
    background: 'var(--dsw-alias-interactive-bg-hover, rgb(0 0 0 / 6%))',
  },
  gitRowName: {
    minWidth: 0,
    flex: '0 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 13,
  },
  gitRowDir: {
    marginLeft: 0,
    flex: '1 1 0',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-secondary, #8a8a8a)',
  },
  gitRowActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    position: 'absolute',
    right: 24,
    top: 0,
    bottom: 0,
    paddingLeft: 8,
    background: 'var(--dsw-alias-bg-base, #fff)',
    opacity: 0,
    pointerEvents: 'none',
  },
  gitTiny: {
    width: 22,
    height: 22,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    opacity: 0.7,
  },
  gitDiffWrap: {
    flex: '1 1 45%',
    minHeight: 140,
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid var(--dsw-alias-border, #ececec)',
    minWidth: 0,
  },
  gitDiffBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    flex: '0 0 auto',
  },
  gitDiffKind: {
    fontWeight: 500,
    fontSize: 11,
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
  },
  gitDiff: {
    margin: 0,
    padding: '8px 10px 12px',
    overflow: 'auto',
    flex: 1,
    minHeight: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  gitDiffEmpty: {
    padding: '16px 12px',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
  },
  gitForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '8px 10px 16px',
  },
  gitGraphTools: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '0 8px 6px',
    minWidth: 0,
  },
  gitGraphSearch: {
    flex: 1,
    minWidth: 0,
    height: 24,
    margin: 0,
    padding: '0 8px',
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    borderRadius: 2,
    font: 'inherit',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'inherit',
  },
  gitGraphToggle: {
    flex: 'none',
    height: 22,
    margin: 0,
    padding: '0 8px',
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    borderRadius: 2,
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  gitGraphRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '0 8px 0 10px',
    minHeight: 22,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  gitGraphBody: {
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  gitGraphSubject: {
    minWidth: 0,
    flex: '1 1 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 12,
  },
  gitGraphAgo: {
    flex: '0 0 auto',
    fontSize: 11,
    color: 'var(--dsw-alias-fg-secondary, #8a8a8a)',
    whiteSpace: 'nowrap',
  },
  gitGraphPills: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flex: '0 1 auto',
    minWidth: 0,
    overflow: 'hidden',
  },
  gitPill: {
    flex: 'none',
    fontSize: 10,
    lineHeight: '14px',
    padding: '0 5px',
    borderRadius: 8,
    whiteSpace: 'nowrap',
    maxWidth: 92,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  gitGraphMore: {
    display: 'block',
    width: 'calc(100% - 16px)',
    margin: '4px 8px 8px',
    padding: '4px 8px',
    border: 'none',
    borderRadius: 2,
    background: 'transparent',
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
    font: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'center',
  },
  gitGraphHint: {
    padding: '6px 12px 10px',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
  },
  gitDiffAdd: {
    color: '#3ba55d',
  },
  gitDiffDel: {
    color: '#e05252',
  },
  gitDiffHunk: {
    color: '#6a9a73',
  },
  gitDiffMeta: {
    color: 'var(--dsw-alias-fg-secondary, #8a8a8a)',
  },
  gitDiffCtx: {
    color: 'inherit',
  },
  gitCompare: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  gitCompareCol: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  gitCompareHead: {
    flex: '0 0 auto',
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  gitHunkBar: {
    flex: '0 0 auto',
    maxHeight: 140,
    overflow: 'auto',
    borderBottom: '1px solid var(--dsw-alias-border, #ececec)',
    padding: '4px 8px 6px',
  },
  gitHunkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 0',
    fontSize: 11,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  gitLinkBtn: {
    margin: 0,
    padding: '1px 6px',
    border: '1px solid var(--dsw-alias-border, #d0d0d0)',
    borderRadius: 2,
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: 11,
    cursor: 'pointer',
  },
  gitBanner: {
    margin: '0 10px 8px',
    padding: '6px 8px',
    fontSize: 12,
    background: 'rgb(209 154 32 / 16%)',
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  gitSync: {
    flex: 'none',
    margin: 0,
    padding: '0 6px',
    height: 22,
    border: 'none',
    borderRadius: 2,
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  gitCheck: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    margin: '0 10px 8px',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
    userSelect: 'none',
  },
  gitBlame: {
    margin: 0,
    padding: '8px 10px 16px',
    overflow: 'auto',
    flex: 1,
    minHeight: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12,
    lineHeight: 1.45,
  },
  gitBlameLine: {
    display: 'flex',
    gap: 12,
    minWidth: 0,
  },
  gitBlameMeta: {
    flex: 'none',
    width: 160,
    color: 'var(--dsw-alias-fg-secondary, #6b6b6b)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  gitBlameText: {
    flex: 1,
    minWidth: 0,
    whiteSpace: 'pre',
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
  gitPick: {
    width: 560,
    maxWidth: '100%',
    maxHeight: 'min(480px, 78%)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'var(--dsw-alias-fg-default, #3c3c3c)',
    border: '1px solid var(--dsw-alias-border, #e5e5e5)',
    borderRadius: 6,
    boxShadow: '0 12px 40px rgb(0 0 0 / 22%)',
    overflow: 'hidden',
  },
  gitPickInput: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    font: 'inherit',
    fontSize: 13,
    padding: '8px 12px',
    border: 'none',
    borderBottom: '1px solid var(--dsw-alias-border, #e5e5e5)',
    background: 'transparent',
    color: 'inherit',
    outline: '1px solid var(--dsw-alias-primary, #0078d4)',
    outlineOffset: -1,
  },
  gitPickList: {
    overflow: 'auto',
    flex: 1,
    minHeight: 0,
    padding: '4px 0 8px',
  },
  gitPickItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 12px',
    cursor: 'pointer',
  },
  gitPickItemActive: {
    background: 'var(--dsw-alias-primary, #0078d4)',
    color: '#fff',
  },
  gitPickIcon: {
    flex: '0 0 16px',
    marginTop: 2,
    opacity: 0.85,
    display: 'inline-flex',
  },
  gitPickBody: {
    minWidth: 0,
    flex: 1,
  },
  gitPickTop: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    minWidth: 0,
  },
  gitPickName: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 13,
  },
  gitPickAgo: {
    marginLeft: 'auto',
    flex: '0 0 auto',
    fontSize: 11,
    opacity: 0.7,
    whiteSpace: 'nowrap',
  },
  gitPickKind: {
    flex: '0 0 auto',
    fontSize: 11,
    opacity: 0.7,
    whiteSpace: 'nowrap',
  },
  gitPickMeta: {
    marginTop: 2,
    fontSize: 11,
    opacity: 0.65,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  gitPickError: {
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--dsw-alias-fg-danger, #b42318)',
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
[data-dsh-side-panels] button[data-dsh-git-commit]:hover:not(:disabled) {
  background: var(--dsw-alias-primary, #0078d4) !important;
  filter: brightness(1.08);
}
[data-dsh-side-panels] [data-dsh-git-pick] input:focus,
[data-dsh-side-panels] [data-dsh-git-message]:focus {
  outline: 1px solid var(--dsw-alias-primary, #0078d4);
}
[data-dsh-side-panels] [data-dsh-git-row]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgb(0 0 0 / 6%));
}
[data-dsh-side-panels] [data-dsh-git-row]:hover [data-dsh-git-actions],
[data-dsh-side-panels] [data-dsh-git-row][data-active="1"] [data-dsh-git-actions] {
  opacity: 1;
  pointer-events: auto;
  background: var(--dsw-alias-interactive-bg-hover, rgb(0 0 0 / 6%));
}
[data-dsh-side-panels] [data-dsh-git-section]:hover [data-dsh-git-section-actions] {
  opacity: 1;
  pointer-events: auto;
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
[data-dsh-side-panels] [data-dsh-files-tabs] {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgb(0 0 0 / 28%) transparent;
}
[data-dsh-side-panels] [data-dsh-files-tabs]::-webkit-scrollbar {
  height: 3px;
}
[data-dsh-side-panels] [data-dsh-files-tabs]::-webkit-scrollbar-track {
  background: transparent;
}
[data-dsh-side-panels] [data-dsh-files-tabs]::-webkit-scrollbar-thumb {
  background: rgb(0 0 0 / 28%);
  border-radius: 99px;
}
[data-dsh-side-panels] [data-dsh-file-tab]:hover {
  background: rgb(127 127 127 / 10%);
  opacity: 1;
}
[data-dsh-side-panels] [data-dsh-file-tab] button,
[data-dsh-side-panels] [data-dsh-file-tab] button:hover:not(:disabled) {
  background: transparent !important;
}
[data-dsh-side-panels] [data-dsh-file-tab-active] {
  background: rgb(0 122 204 / 14%) !important;
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
[data-dsh-side-panels] [data-dsh-browser-url]:focus {
  border-color: rgb(0 122 204 / 45%);
  background: var(--dsw-alias-bg-base, #fff);
}
[data-dsh-side-panels] [data-dsh-browser-guest] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
[data-dsh-side-panels] [data-dsh-browser-devtools] {
  position: absolute;
  left: 0;
  top: 0;
  border: 0;
  background: #202124;
}
[data-dsh-side-panels] [data-dsh-browser-tab]:hover {
  background: rgb(127 127 127 / 10%);
  opacity: 1;
}
[data-dsh-side-panels] [data-dsh-browser-tab]:active {
  background: rgb(127 127 127 / 18%);
  transform: translateY(1px);
}
[data-dsh-side-panels] [data-dsh-browser-tab-active] {
  background: var(--dsw-alias-bg-base, #fff) !important;
  opacity: 1;
}
[data-dsh-side-panels] [data-dsh-browser] button {
  transition: transform .08s ease, background .08s ease, filter .08s ease, opacity .08s ease;
}
[data-dsh-side-panels] [data-dsh-browser] button:hover:not(:disabled) {
  opacity: 1;
}
[data-dsh-side-panels] [data-dsh-browser] button:active:not(:disabled) {
  transform: translateY(1px) scale(.94);
  filter: brightness(.9);
  background: rgb(127 127 127 / 20%) !important;
}
[data-dsh-side-panels] [data-dsh-browser] button[data-dsh-browser-primary]:hover:not(:disabled) {
  background: rgb(0 105 180) !important;
  color: #fff !important;
  filter: none;
}
[data-dsh-side-panels] [data-dsh-browser] button[data-dsh-browser-primary]:active:not(:disabled) {
  background: rgb(0 88 150) !important;
  color: #fff !important;
  transform: translateY(1px) scale(.98);
  filter: none;
}
[data-dsh-side-panels] button[data-dsh-browser-f12] {
  font-size: 10px !important;
  font-weight: 700;
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
