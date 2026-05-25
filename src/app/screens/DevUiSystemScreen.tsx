import type { ReactElement } from "react";

import { MistLayer, XianxiaButton, XianxiaDialog, XianxiaInput, XianxiaPanel, XianxiaSaveCard } from "../ui-system";

export function DevUiSystemScreen(): ReactElement {
  return (
    <main className="xianxia-ui-system-showcase">
      <MistLayer />
      <header className="xianxia-ui-system-header">
        <h1>Xianxia UI System</h1>
        <p>DOM controls for ceremonial jade-and-gold outgame screens.</p>
      </header>

      <section className="xianxia-ui-system-grid" aria-label="Xianxia UI component showcase">
        <XianxiaPanel className="xianxia-ui-system-block" tone="ceremonial">
          <h2>Buttons</h2>
          <div className="xianxia-ui-system-row">
            <XianxiaButton>确认此生</XianxiaButton>
            <XianxiaButton variant="secondary">返回</XianxiaButton>
            <XianxiaButton variant="danger">覆盖命簿</XianxiaButton>
          </div>
        </XianxiaPanel>

        <XianxiaPanel className="xianxia-ui-system-block">
          <h2>Save Cards</h2>
          <div className="xianxia-ui-system-stack">
            <XianxiaSaveCard characterName="李青云" cultivation="18岁 · 练气 3层 · 修为 120/480" progress="当前进度：青云山" saveName="云海初劫" />
            <XianxiaSaveCard empty />
          </div>
        </XianxiaPanel>

        <XianxiaPanel className="xianxia-ui-system-block" tone="danger">
          <h2>Dialog</h2>
          <div className="xianxia-dialog is-showcase">
            <span className="xianxia-dialog-formation" aria-hidden="true" />
            <h3 className="xianxia-dialog-title">覆盖存档</h3>
            <p className="xianxia-dialog-description">此命簿已有记录，覆盖后将重新推演此生。</p>
            <div className="xianxia-dialog-body">
              <XianxiaInput label="存档名" placeholder="请输入存档名" />
            </div>
            <div className="xianxia-dialog-actions">
              <XianxiaButton variant="secondary">取消</XianxiaButton>
              <XianxiaButton variant="danger">覆盖</XianxiaButton>
            </div>
          </div>
        </XianxiaPanel>

        <XianxiaDialog
          actions={<XianxiaButton>示例确认</XianxiaButton>}
          description="force-mounted Radix dialog shell for accessibility preview."
          open={false}
          title="Radix Dialog Shell"
        >
          <span>Dialog content</span>
        </XianxiaDialog>
      </section>
    </main>
  );
}
