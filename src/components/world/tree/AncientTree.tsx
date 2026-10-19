import { Branches } from './Branches';
import { Roots } from './Roots';
import { SapFlow } from './SapFlow';

/** Roots (1 mesh) + trunk & branches (1 mesh) + sap particles (1 draw call). Labels live in WorldOverlay. */
export function AncientTree() {
  return (
    <group>
      <Roots />
      <Branches />
      <SapFlow />
    </group>
  );
}
