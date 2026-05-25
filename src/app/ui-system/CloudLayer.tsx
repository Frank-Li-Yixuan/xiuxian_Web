import type { ReactElement } from "react";

export function CloudLayer(): ReactElement {
  return (
    <div aria-hidden="true" className="xianxia-cloud-layer" data-cloud-layer="auspicious">
      <span className="xianxia-auspicious-cloud xianxia-auspicious-cloud-a" />
      <span className="xianxia-auspicious-cloud xianxia-auspicious-cloud-b" />
      <span className="xianxia-auspicious-cloud xianxia-auspicious-cloud-c" />
      <span className="xianxia-auspicious-cloud xianxia-auspicious-cloud-d" />
    </div>
  );
}
