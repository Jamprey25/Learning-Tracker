import { applyGraphColorGroups } from "./obsidian-graph-colors";

const vault =
  process.env.OBSIDIAN_VAULT_PATH?.trim() ||
  "/Users/josephamprey/Documents/Documents - Joseph’s MacBook Air (2)/Obsidian Vault";

async function main() {
  await applyGraphColorGroups(`${vault}/.obsidian`);
  await applyGraphColorGroups(`${vault}/Learning Tracker/.obsidian`);
  console.log(`Applied graph color groups in ${vault}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
