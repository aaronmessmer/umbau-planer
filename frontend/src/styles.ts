import { css } from "lit";

export const sharedStyles = css`
  :host {
    display: block;
    color: var(--primary-text-color);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    font-size: 14px;
  }
  * {
    box-sizing: border-box;
  }
  h2 {
    font-size: 18px;
    font-weight: 500;
    margin: 4px 0 8px;
  }
  h3 {
    font-size: 15px;
    font-weight: 500;
    margin: 12px 0 6px;
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .small {
    font-size: 12px;
  }
  .right {
    margin-left: auto;
  }
  .card {
    background: var(--card-background-color, #fff);
    border-radius: var(--ha-card-border-radius, 12px);
    border: 1px solid var(--divider-color);
    padding: 10px 12px;
    margin: 0 0 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .row.nowrap {
    flex-wrap: nowrap;
  }
  .grow {
    flex: 1 1 0;
    min-width: 0;
  }
  button,
  .btn {
    font: inherit;
    cursor: pointer;
    border: 1px solid var(--divider-color);
    background: var(--secondary-background-color, #f3f3f3);
    color: var(--primary-text-color);
    border-radius: 8px;
    padding: 6px 10px;
    min-height: 34px;
  }
  button:hover {
    filter: brightness(0.96);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button.primary {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color);
  }
  button.danger {
    color: var(--error-color, #db4437);
    border-color: var(--error-color, #db4437);
  }
  button.icon {
    padding: 2px 8px;
    min-width: 34px;
  }
  button.link {
    border: none;
    background: none;
    padding: 2px 4px;
    color: var(--primary-color);
  }
  input,
  select,
  textarea {
    font: inherit;
    color: var(--primary-text-color);
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    padding: 6px 8px;
    min-height: 34px;
    max-width: 100%;
  }
  input:focus,
  select:focus,
  textarea:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: -1px;
  }
  textarea {
    width: 100%;
    min-height: 60px;
  }
  input.inline {
    border-color: transparent;
    background: transparent;
    padding: 2px 4px;
    min-height: 28px;
  }
  input.inline:hover,
  input.inline:focus {
    border-color: var(--divider-color);
    background: var(--card-background-color, #fff);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 12px;
    line-height: 20px;
    background: var(--secondary-background-color, #eee);
    border: 1px solid var(--divider-color);
    white-space: nowrap;
  }
  .chip.ok {
    background: color-mix(in srgb, var(--success-color, #43a047) 20%, transparent);
    border-color: var(--success-color, #43a047);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 25%, transparent);
    border-color: var(--warning-color, #ffa600);
  }
  .chip.err {
    background: color-mix(in srgb, var(--error-color, #db4437) 20%, transparent);
    border-color: var(--error-color, #db4437);
  }
  .chip.inherited {
    font-style: italic;
    opacity: 0.7;
    border-style: dashed;
  }
  .bar {
    height: 10px;
    border-radius: 6px;
    background: var(--secondary-background-color, #e0e0e0);
    overflow: hidden;
    position: relative;
    min-width: 80px;
  }
  .bar > span {
    display: block;
    height: 100%;
    background: var(--primary-color);
  }
  .bar.over > span {
    background: var(--error-color, #db4437);
  }
  .warning-box {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 18%, transparent);
    border-left: 4px solid var(--warning-color, #ffa600);
    padding: 6px 10px;
    border-radius: 6px;
    margin: 6px 0;
    font-size: 13px;
  }
  .error-box {
    background: color-mix(in srgb, var(--error-color, #db4437) 15%, transparent);
    border-left: 4px solid var(--error-color, #db4437);
    padding: 6px 10px;
    border-radius: 6px;
    margin: 6px 0;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: 4px 6px;
    border-bottom: 1px solid var(--divider-color);
    vertical-align: top;
  }
  th {
    font-weight: 500;
    font-size: 12px;
    color: var(--secondary-text-color);
  }
  td.num,
  th.num {
    text-align: right;
    white-space: nowrap;
  }
  .scroll-x {
    overflow-x: auto;
  }
  .empty {
    padding: 24px;
    text-align: center;
    color: var(--secondary-text-color);
  }
  .drop-target {
    outline: 2px dashed var(--primary-color);
    outline-offset: -2px;
  }
`;
