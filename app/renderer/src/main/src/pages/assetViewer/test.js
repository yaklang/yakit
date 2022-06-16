import htmlDocx from "html-docx-js/dist/html-docx"
import saveAs from "file-saver"

const antdCssString = `
/* stylelint-disable at-rule-empty-line-before,at-rule-name-space-after,at-rule-no-unknown */
/* stylelint-disable no-duplicate-selectors */
/* stylelint-disable */
/* stylelint-disable declaration-bang-space-before,no-duplicate-selectors,string-no-newline */
.ant-table.ant-table-middle {
  font-size: 14px;
}
.ant-table.ant-table-middle .ant-table-title,
.ant-table.ant-table-middle .ant-table-footer,
.ant-table.ant-table-middle .ant-table-thead > tr > th,
.ant-table.ant-table-middle .ant-table-tbody > tr > td,
.ant-table.ant-table-middle tfoot > tr > th,
.ant-table.ant-table-middle tfoot > tr > td {
  padding: 12px 8px;
}
.ant-table.ant-table-middle .ant-table-filter-trigger {
  margin-right: -4px;
}
.ant-table.ant-table-middle .ant-table-expanded-row-fixed {
  margin: -12px -8px;
}
.ant-table.ant-table-middle .ant-table-tbody .ant-table-wrapper:only-child .ant-table {
  margin: -12px -8px -12px 25px;
}
.ant-table.ant-table-small {
  font-size: 14px;
}
.ant-table.ant-table-small .ant-table-title,
.ant-table.ant-table-small .ant-table-footer,
.ant-table.ant-table-small .ant-table-thead > tr > th,
.ant-table.ant-table-small .ant-table-tbody > tr > td,
.ant-table.ant-table-small tfoot > tr > th,
.ant-table.ant-table-small tfoot > tr > td {
  padding: 8px 8px;
}
.ant-table.ant-table-small .ant-table-filter-trigger {
  margin-right: -4px;
}
.ant-table.ant-table-small .ant-table-expanded-row-fixed {
  margin: -8px -8px;
}
.ant-table.ant-table-small .ant-table-tbody .ant-table-wrapper:only-child .ant-table {
  margin: -8px -8px -8px 25px;
}
.ant-table-small .ant-table-thead > tr > th {
  background-color: #fafafa;
}
.ant-table-small .ant-table-selection-column {
  width: 46px;
  min-width: 46px;
}
.ant-table.ant-table-bordered > .ant-table-title {
  border: 1px solid #f0f0f0;
  border-bottom: 0;
}
.ant-table.ant-table-bordered > .ant-table-container {
  border-left: 1px solid #f0f0f0;
}
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > thead > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > thead > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > thead > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > thead > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > tbody > tr > td,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > tbody > tr > td,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > tbody > tr > td,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > tbody > tr > td,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > tfoot > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > tfoot > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > tfoot > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > tfoot > tr > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > tfoot > tr > td,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > tfoot > tr > td,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > tfoot > tr > td,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > tfoot > tr > td {
  border-right: 1px solid #f0f0f0;
}
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > thead > tr:not(:last-child) > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > thead > tr:not(:last-child) > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > thead > tr:not(:last-child) > th,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > thead > tr:not(:last-child) > th {
  border-bottom: 1px solid #f0f0f0;
}
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > thead > tr > th::before,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > thead > tr > th::before,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > thead > tr > th::before,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > thead > tr > th::before {
  background-color: transparent !important;
}
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > thead > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > thead > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > thead > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > thead > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > tbody > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > tbody > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > tbody > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > tbody > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > tfoot > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > tfoot > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > tfoot > tr > .ant-table-cell-fix-right-first::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > tfoot > tr > .ant-table-cell-fix-right-first::after {
  border-right: 1px solid #f0f0f0;
}
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > tbody > tr > td > .ant-table-expanded-row-fixed,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > tbody > tr > td > .ant-table-expanded-row-fixed,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > tbody > tr > td > .ant-table-expanded-row-fixed,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > tbody > tr > td > .ant-table-expanded-row-fixed {
  margin: -16px -17px;
}
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table > tbody > tr > td > .ant-table-expanded-row-fixed::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table > tbody > tr > td > .ant-table-expanded-row-fixed::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-body > table > tbody > tr > td > .ant-table-expanded-row-fixed::after,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-summary > table > tbody > tr > td > .ant-table-expanded-row-fixed::after {
  position: absolute;
  top: 0;
  right: 1px;
  bottom: 0;
  border-right: 1px solid #f0f0f0;
  content: '';
}
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table,
.ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table {
  border-top: 1px solid #f0f0f0;
}
.ant-table.ant-table-bordered.ant-table-scroll-horizontal > .ant-table-container > .ant-table-body > table > tbody > tr.ant-table-expanded-row > td,
.ant-table.ant-table-bordered.ant-table-scroll-horizontal > .ant-table-container > .ant-table-body > table > tbody > tr.ant-table-placeholder > td {
  border-right: 0;
}
.ant-table.ant-table-bordered.ant-table-middle > .ant-table-container > .ant-table-content > table > tbody > tr > td > .ant-table-expanded-row-fixed,
.ant-table.ant-table-bordered.ant-table-middle > .ant-table-container > .ant-table-body > table > tbody > tr > td > .ant-table-expanded-row-fixed {
  margin: -12px -9px;
}
.ant-table.ant-table-bordered.ant-table-small > .ant-table-container > .ant-table-content > table > tbody > tr > td > .ant-table-expanded-row-fixed,
.ant-table.ant-table-bordered.ant-table-small > .ant-table-container > .ant-table-body > table > tbody > tr > td > .ant-table-expanded-row-fixed {
  margin: -8px -9px;
}
.ant-table.ant-table-bordered > .ant-table-footer {
  border: 1px solid #f0f0f0;
  border-top: 0;
}
.ant-table-cell .ant-table-container:first-child {
  border-top: 0;
}
.ant-table-cell-scrollbar {
  box-shadow: 0 1px 0 1px #fafafa;
}
.ant-table-wrapper {
  clear: both;
  max-width: 100%;
}
.ant-table-wrapper::before {
  display: table;
  content: '';
}
.ant-table-wrapper::after {
  display: table;
  clear: both;
  content: '';
}
.ant-table {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  color: rgba(0, 0, 0, 0.85);
  font-variant: tabular-nums;
  line-height: 1.5715;
  list-style: none;
  font-feature-settings: 'tnum';
  position: relative;
  font-size: 14px;
  background: #fff;
  border-radius: 2px;
}
.ant-table table {
  width: 100%;
  text-align: left;
  border-radius: 2px 2px 0 0;
  border-collapse: separate;
  border-spacing: 0;
}
.ant-table-thead > tr > th,
.ant-table-tbody > tr > td,
.ant-table tfoot > tr > th,
.ant-table tfoot > tr > td {
  position: relative;
  padding: 16px 16px;
  overflow-wrap: break-word;
}
.ant-table-cell-ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  word-break: keep-all;
}
.ant-table-cell-ellipsis.ant-table-cell-fix-left-last,
.ant-table-cell-ellipsis.ant-table-cell-fix-right-first {
  overflow: visible;
}
.ant-table-cell-ellipsis.ant-table-cell-fix-left-last .ant-table-cell-content,
.ant-table-cell-ellipsis.ant-table-cell-fix-right-first .ant-table-cell-content {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ant-table-cell-ellipsis .ant-table-column-title {
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: keep-all;
}
.ant-table-title {
  padding: 16px 16px;
}
.ant-table-footer {
  padding: 16px 16px;
  color: rgba(0, 0, 0, 0.85);
  background: #fafafa;
}
.ant-table-thead > tr > th {
  position: relative;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  text-align: left;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s ease;
}
.ant-table-thead > tr > th[colspan]:not([colspan='1']) {
  text-align: center;
}
.ant-table-thead > tr > th:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan])::before {
  position: absolute;
  top: 50%;
  right: 0;
  width: 1px;
  height: 1.6em;
  background-color: rgba(0, 0, 0, 0.06);
  transform: translateY(-50%);
  transition: background-color 0.3s;
  content: '';
}
.ant-table-thead > tr:not(:last-child) > th[colspan] {
  border-bottom: 0;
}
.ant-table-tbody > tr > td {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s;
}
.ant-table-tbody > tr > td > .ant-table-wrapper:only-child .ant-table,
.ant-table-tbody > tr > td > .ant-table-expanded-row-fixed > .ant-table-wrapper:only-child .ant-table {
  margin: -16px -16px -16px 33px;
}
.ant-table-tbody > tr > td > .ant-table-wrapper:only-child .ant-table-tbody > tr:last-child > td,
.ant-table-tbody > tr > td > .ant-table-expanded-row-fixed > .ant-table-wrapper:only-child .ant-table-tbody > tr:last-child > td {
  border-bottom: 0;
}
.ant-table-tbody > tr > td > .ant-table-wrapper:only-child .ant-table-tbody > tr:last-child > td:first-child,
.ant-table-tbody > tr > td > .ant-table-expanded-row-fixed > .ant-table-wrapper:only-child .ant-table-tbody > tr:last-child > td:first-child,
.ant-table-tbody > tr > td > .ant-table-wrapper:only-child .ant-table-tbody > tr:last-child > td:last-child,
.ant-table-tbody > tr > td > .ant-table-expanded-row-fixed > .ant-table-wrapper:only-child .ant-table-tbody > tr:last-child > td:last-child {
  border-radius: 0;
}
.ant-table-tbody > tr.ant-table-row:hover > td,
.ant-table-tbody > tr > td.ant-table-cell-row-hover {
  background: #fafafa;
}
.ant-table-tbody > tr.ant-table-row-selected > td {
  background: #e6f7ff;
  border-color: rgba(0, 0, 0, 0.03);
}
.ant-table-tbody > tr.ant-table-row-selected:hover > td {
  background: #dcf4ff;
}
.ant-table-summary {
  position: relative;
  z-index: 2;
  background: #fff;
}
div.ant-table-summary {
  box-shadow: 0 -1px 0 #f0f0f0;
}
.ant-table-summary > tr > th,
.ant-table-summary > tr > td {
  border-bottom: 1px solid #f0f0f0;
}
.ant-table-pagination.ant-pagination {
  margin: 16px 0;
}
.ant-table-pagination {
  display: flex;
  flex-wrap: wrap;
  row-gap: 8px;
}
.ant-table-pagination > * {
  flex: none;
}
.ant-table-pagination-left {
  justify-content: flex-start;
}
.ant-table-pagination-center {
  justify-content: center;
}
.ant-table-pagination-right {
  justify-content: flex-end;
}
.ant-table-thead th.ant-table-column-has-sorters {
  cursor: pointer;
  transition: all 0.3s;
}
.ant-table-thead th.ant-table-column-has-sorters:hover {
  background: rgba(0, 0, 0, 0.04);
}
.ant-table-thead th.ant-table-column-has-sorters:hover::before {
  background-color: transparent !important;
}
.ant-table-thead th.ant-table-column-has-sorters.ant-table-cell-fix-left:hover,
.ant-table-thead th.ant-table-column-has-sorters.ant-table-cell-fix-right:hover {
  background: #f5f5f5;
}
.ant-table-thead th.ant-table-column-sort {
  background: #f5f5f5;
}
.ant-table-thead th.ant-table-column-sort::before {
  background-color: transparent !important;
}
td.ant-table-column-sort {
  background: #fafafa;
}
.ant-table-column-title {
  position: relative;
  z-index: 1;
  flex: 1;
}
.ant-table-column-sorters {
  display: flex;
  flex: auto;
  align-items: center;
  justify-content: space-between;
}
.ant-table-column-sorters::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  content: '';
}
.ant-table-column-sorter {
  margin-left: 4px;
  color: #bfbfbf;
  font-size: 0;
  transition: color 0.3s;
}
.ant-table-column-sorter-inner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}
.ant-table-column-sorter-up,
.ant-table-column-sorter-down {
  font-size: 11px;
}
.ant-table-column-sorter-up.active,
.ant-table-column-sorter-down.active {
  color: #1890ff;
}
.ant-table-column-sorter-up + .ant-table-column-sorter-down {
  margin-top: -0.3em;
}
.ant-table-column-sorters:hover .ant-table-column-sorter {
  color: #a6a6a6;
}
.ant-table-filter-column {
  display: flex;
  justify-content: space-between;
}
.ant-table-filter-trigger {
  position: relative;
  display: flex;
  align-items: center;
  margin: -4px -8px -4px 4px;
  padding: 0 4px;
  color: #bfbfbf;
  font-size: 12px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.3s;
}
.ant-table-filter-trigger:hover {
  color: rgba(0, 0, 0, 0.45);
  background: rgba(0, 0, 0, 0.04);
}
.ant-table-filter-trigger.active {
  color: #1890ff;
}
.ant-table-filter-dropdown {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  color: rgba(0, 0, 0, 0.85);
  font-size: 14px;
  font-variant: tabular-nums;
  line-height: 1.5715;
  list-style: none;
  font-feature-settings: 'tnum';
  min-width: 120px;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
}
.ant-table-filter-dropdown .ant-dropdown-menu {
  max-height: 264px;
  overflow-x: hidden;
  border: 0;
  box-shadow: none;
}
.ant-table-filter-dropdown .ant-dropdown-menu:empty::after {
  display: block;
  padding: 8px 0;
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
  text-align: center;
  content: 'Not Found';
}
.ant-table-filter-dropdown-tree {
  padding: 8px 8px 0;
}
.ant-table-filter-dropdown-tree .ant-tree-treenode .ant-tree-node-content-wrapper:hover {
  background-color: #f5f5f5;
}
.ant-table-filter-dropdown-tree .ant-tree-treenode-checkbox-checked .ant-tree-node-content-wrapper,
.ant-table-filter-dropdown-tree .ant-tree-treenode-checkbox-checked .ant-tree-node-content-wrapper:hover {
  background-color: #bae7ff;
}
.ant-table-filter-dropdown-search {
  padding: 8px;
  border-bottom: 1px #f0f0f0 solid;
}
.ant-table-filter-dropdown-search-input input {
  min-width: 140px;
}
.ant-table-filter-dropdown-search-input .anticon {
  color: rgba(0, 0, 0, 0.25);
}
.ant-table-filter-dropdown-checkall {
  width: 100%;
  margin-bottom: 4px;
  margin-left: 4px;
}
.ant-table-filter-dropdown-submenu > ul {
  max-height: calc(100vh - 130px);
  overflow-x: hidden;
  overflow-y: auto;
}
.ant-table-filter-dropdown .ant-checkbox-wrapper + span,
.ant-table-filter-dropdown-submenu .ant-checkbox-wrapper + span {
  padding-left: 8px;
}
.ant-table-filter-dropdown-btns {
  display: flex;
  justify-content: space-between;
  padding: 7px 8px;
  overflow: hidden;
  background-color: inherit;
  border-top: 1px solid #f0f0f0;
}
.ant-table-selection-col {
  width: 32px;
}
.ant-table-bordered .ant-table-selection-col {
  width: 50px;
}
table tr th.ant-table-selection-column,
table tr td.ant-table-selection-column {
  padding-right: 8px;
  padding-left: 8px;
  text-align: center;
}
table tr th.ant-table-selection-column .ant-radio-wrapper,
table tr td.ant-table-selection-column .ant-radio-wrapper {
  margin-right: 0;
}
table tr th.ant-table-selection-column.ant-table-cell-fix-left {
  z-index: 3;
}
table tr th.ant-table-selection-column::after {
  background-color: transparent !important;
}
.ant-table-selection {
  position: relative;
  display: inline-flex;
  flex-direction: column;
}
.ant-table-selection-extra {
  position: absolute;
  top: 0;
  z-index: 1;
  cursor: pointer;
  transition: all 0.3s;
  -webkit-margin-start: 100%;
          margin-inline-start: 100%;
  -webkit-padding-start: 4px;
          padding-inline-start: 4px;
}
.ant-table-selection-extra .anticon {
  color: #bfbfbf;
  font-size: 10px;
}
.ant-table-selection-extra .anticon:hover {
  color: #a6a6a6;
}
.ant-table-expand-icon-col {
  width: 48px;
}
.ant-table-row-expand-icon-cell {
  text-align: center;
}
.ant-table-row-indent {
  float: left;
  height: 1px;
}
.ant-table-row-expand-icon {
  color: #1890ff;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  display: inline-flex;
  float: left;
  box-sizing: border-box;
  width: 17px;
  height: 17px;
  padding: 0;
  color: inherit;
  line-height: 17px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 2px;
  outline: none;
  transform: scale(0.94117647);
  transition: all 0.3s;
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
}
.ant-table-row-expand-icon:focus,
.ant-table-row-expand-icon:hover {
  color: #40a9ff;
}
.ant-table-row-expand-icon:active {
  color: #096dd9;
}
.ant-table-row-expand-icon:focus,
.ant-table-row-expand-icon:hover,
.ant-table-row-expand-icon:active {
  border-color: currentColor;
}
.ant-table-row-expand-icon::before,
.ant-table-row-expand-icon::after {
  position: absolute;
  background: currentColor;
  transition: transform 0.3s ease-out;
  content: '';
}
.ant-table-row-expand-icon::before {
  top: 7px;
  right: 3px;
  left: 3px;
  height: 1px;
}
.ant-table-row-expand-icon::after {
  top: 3px;
  bottom: 3px;
  left: 7px;
  width: 1px;
  transform: rotate(90deg);
}
.ant-table-row-expand-icon-collapsed::before {
  transform: rotate(-180deg);
}
.ant-table-row-expand-icon-collapsed::after {
  transform: rotate(0deg);
}
.ant-table-row-expand-icon-spaced {
  background: transparent;
  border: 0;
  visibility: hidden;
}
.ant-table-row-expand-icon-spaced::before,
.ant-table-row-expand-icon-spaced::after {
  display: none;
  content: none;
}
.ant-table-row-indent + .ant-table-row-expand-icon {
  margin-top: 2.5005px;
  margin-right: 8px;
}
tr.ant-table-expanded-row > td,
tr.ant-table-expanded-row:hover > td {
  background: #fbfbfb;
}
tr.ant-table-expanded-row .ant-descriptions-view {
  display: flex;
}
tr.ant-table-expanded-row .ant-descriptions-view table {
  flex: auto;
  width: auto;
}
.ant-table .ant-table-expanded-row-fixed {
  position: relative;
  margin: -16px -16px;
  padding: 16px 16px;
}
.ant-table-tbody > tr.ant-table-placeholder {
  text-align: center;
}
.ant-table-empty .ant-table-tbody > tr.ant-table-placeholder {
  color: rgba(0, 0, 0, 0.25);
}
.ant-table-tbody > tr.ant-table-placeholder:hover > td {
  background: #fff;
}
.ant-table-cell-fix-left,
.ant-table-cell-fix-right {
  position: -webkit-sticky !important;
  position: sticky !important;
  z-index: 2;
  background: #fff;
}
.ant-table-cell-fix-left-first::after,
.ant-table-cell-fix-left-last::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: -1px;
  width: 30px;
  transform: translateX(100%);
  transition: box-shadow 0.3s;
  content: '';
  pointer-events: none;
}
.ant-table-cell-fix-right-first::after,
.ant-table-cell-fix-right-last::after {
  position: absolute;
  top: 0;
  bottom: -1px;
  left: 0;
  width: 30px;
  transform: translateX(-100%);
  transition: box-shadow 0.3s;
  content: '';
  pointer-events: none;
}
.ant-table .ant-table-container::before,
.ant-table .ant-table-container::after {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 30px;
  transition: box-shadow 0.3s;
  content: '';
  pointer-events: none;
}
.ant-table .ant-table-container::before {
  left: 0;
}
.ant-table .ant-table-container::after {
  right: 0;
}
.ant-table-ping-left:not(.ant-table-has-fix-left) .ant-table-container {
  position: relative;
}
.ant-table-ping-left:not(.ant-table-has-fix-left) .ant-table-container::before {
  box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, 0.15);
}
.ant-table-ping-left .ant-table-cell-fix-left-first::after,
.ant-table-ping-left .ant-table-cell-fix-left-last::after {
  box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, 0.15);
}
.ant-table-ping-left .ant-table-cell-fix-left-last::before {
  background-color: transparent !important;
}
.ant-table-ping-right:not(.ant-table-has-fix-right) .ant-table-container {
  position: relative;
}
.ant-table-ping-right:not(.ant-table-has-fix-right) .ant-table-container::after {
  box-shadow: inset -10px 0 8px -8px rgba(0, 0, 0, 0.15);
}
.ant-table-ping-right .ant-table-cell-fix-right-first::after,
.ant-table-ping-right .ant-table-cell-fix-right-last::after {
  box-shadow: inset -10px 0 8px -8px rgba(0, 0, 0, 0.15);
}
.ant-table-sticky-holder {
  position: -webkit-sticky;
  position: sticky;
  z-index: calc(2 + 1);
  background: #fff;
}
.ant-table-sticky-scroll {
  position: -webkit-sticky;
  position: sticky;
  bottom: 0;
  z-index: calc(2 + 1);
  display: flex;
  align-items: center;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  opacity: 0.6;
}
.ant-table-sticky-scroll:hover {
  transform-origin: center bottom;
}
.ant-table-sticky-scroll-bar {
  height: 8px;
  background-color: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
}
.ant-table-sticky-scroll-bar:hover {
  background-color: rgba(0, 0, 0, 0.8);
}
.ant-table-sticky-scroll-bar-active {
  background-color: rgba(0, 0, 0, 0.8);
}
@media all and (-ms-high-contrast: none) {
  .ant-table-ping-left .ant-table-cell-fix-left-last::after {
    box-shadow: none !important;
  }
  .ant-table-ping-right .ant-table-cell-fix-right-first::after {
    box-shadow: none !important;
  }
}
.ant-table {
  /* title + table */
  /* table */
  /* table + footer */
}
.ant-table-title {
  border-radius: 2px 2px 0 0;
}
.ant-table-title + .ant-table-container {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.ant-table-title + .ant-table-container table > thead > tr:first-child th:first-child {
  border-radius: 0;
}
.ant-table-title + .ant-table-container table > thead > tr:first-child th:last-child {
  border-radius: 0;
}
.ant-table-container {
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
}
.ant-table-container table > thead > tr:first-child th:first-child {
  border-top-left-radius: 2px;
}
.ant-table-container table > thead > tr:first-child th:last-child {
  border-top-right-radius: 2px;
}
.ant-table-footer {
  border-radius: 0 0 2px 2px;
}
.ant-table-wrapper-rtl {
  direction: rtl;
}
.ant-table-rtl {
  direction: rtl;
}
.ant-table-wrapper-rtl .ant-table table {
  text-align: right;
}
.ant-table-wrapper-rtl .ant-table-thead > tr > th[colspan]:not([colspan='1']) {
  text-align: center;
}
.ant-table-wrapper-rtl .ant-table-thead > tr > th:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan])::before {
  right: auto;
  left: 0;
}
.ant-table-wrapper-rtl .ant-table-thead > tr > th {
  text-align: right;
}
.ant-table-tbody > tr .ant-table-wrapper:only-child .ant-table.ant-table-rtl {
  margin: -16px 33px -16px -16px;
}
.ant-table-wrapper.ant-table-wrapper-rtl .ant-table-pagination-left {
  justify-content: flex-end;
}
.ant-table-wrapper.ant-table-wrapper-rtl .ant-table-pagination-right {
  justify-content: flex-start;
}
.ant-table-wrapper-rtl .ant-table-column-sorter {
  margin-right: 4px;
  margin-left: 0;
}
.ant-table-wrapper-rtl .ant-table-filter-column-title {
  padding: 16px 16px 16px 2.3em;
}
.ant-table-rtl .ant-table-thead tr th.ant-table-column-has-sorters .ant-table-filter-column-title {
  padding: 0 0 0 2.3em;
}
.ant-table-wrapper-rtl .ant-table-filter-trigger {
  margin: -4px 4px -4px -8px;
}
.ant-dropdown-rtl .ant-table-filter-dropdown .ant-checkbox-wrapper + span,
.ant-dropdown-rtl .ant-table-filter-dropdown-submenu .ant-checkbox-wrapper + span,
.ant-dropdown-menu-submenu-rtl.ant-table-filter-dropdown .ant-checkbox-wrapper + span,
.ant-dropdown-menu-submenu-rtl.ant-table-filter-dropdown-submenu .ant-checkbox-wrapper + span {
  padding-right: 8px;
  padding-left: 0;
}
.ant-table-wrapper-rtl .ant-table-selection {
  text-align: center;
}
.ant-table-wrapper-rtl .ant-table-row-indent {
  float: right;
}
.ant-table-wrapper-rtl .ant-table-row-expand-icon {
  float: right;
}
.ant-table-wrapper-rtl .ant-table-row-indent + .ant-table-row-expand-icon {
  margin-right: 0;
  margin-left: 8px;
}
.ant-table-wrapper-rtl .ant-table-row-expand-icon::after {
  transform: rotate(-90deg);
}
.ant-table-wrapper-rtl .ant-table-row-expand-icon-collapsed::before {
  transform: rotate(180deg);
}
.ant-table-wrapper-rtl .ant-table-row-expand-icon-collapsed::after {
  transform: rotate(0deg);
}

`
const tableCssString = `
table {
  border: 1px solid #f0f0f0;
  width: 100%;
}

th {
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  border-right: 1px solid #f0f0f0;
  height: 30px;
  text-indent: 0.1cm
}

td {
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  border-right: 1px solid #f0f0f0;
  height: 30px;
  text-indent:  0.1cm
}

tr th:last-child {
  border-right: 0;
}
tr td:last-child {
  border-right: 0;
}
tr:last-child td{
  border-bottom:0;
}
`

const mdCssString = `
  code{
    background-color: #f0f0f0;
    border-radius: 3px;
    font-size: 85%;
    margin: 0;
    padding:2.72px 5.44px;
    line-height: 20.4px;
    color:#333
  }
  li{
    line-height: 24px;
  }
`
const codeCssString = `
.monaco-editor {
  color: #363636;
  background-color: #e8e9e8;
  position: relative;
}
.overflow-guard{
  position: relative;
  overflow: hidden;
}
.current-line {
  display: block;
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
}

.line-numbers {
  position: absolute;
  text-align: right;
  display: inline-block;
  vertical-align: middle;
  box-sizing: border-box;
  cursor: default;
  height: 100%;
}

.view-line {
  position: absolute;
  width: 100%;
}

.glyph-margin {
  position: absolute;
  top: 0;
}
textarea{
  display: none;
}
`
export const toWord = async (htmlContent) => {
    const page = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
   ${tableCssString}
   ${mdCssString}
   ${codeCssString}
    </style>
    </head><body>${htmlContent}</body></html>`
    var converted = htmlDocx.asBlob(page)
    // 用 FielSaver.js里的保存方法 进行输出
    saveAs(converted, "test.docx")
}
