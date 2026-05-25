import type { ReactElement } from "react";

export function MistLayer(): ReactElement {
  return (
    <div aria-hidden="true" className="xianxia-mist-layer">
      <span className="xianxia-mist xianxia-mist-a" />
      <span className="xianxia-mist xianxia-mist-b" />
      <span className="xianxia-mist xianxia-mist-c" />
      <span className="xianxia-spirit-light xianxia-spirit-light-a" />
      <span className="xianxia-spirit-light xianxia-spirit-light-b" />
      <span className="xianxia-spirit-light xianxia-spirit-light-c" />
    </div>
  );
}
