// Checks firestore.rules against the real Firestore emulator. See tests/README.md.
import { test, before, beforeEach, after } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";

const DAY = 24 * 3600 * 1000;
let env;
const db = uid => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const list = uid => db(uid).collection("shared").doc("L1");
const info = n => ({ name: n, email: n.toLowerCase() + "@example.com" });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-planner",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8181 },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const f = ctx.firestore();
    await f.doc("users/alice/tasks/t1").set({ title: "Private" });
    await f.doc("shared/L1").set({ name: "Groceries", kind: "shopping", owner: "alice", members: ["alice", "bob"], memberInfo: { alice: info("Alice"), bob: info("Bob") }, createdAt: 1 });
    await f.doc("shared/L1/items/i1").set({ name: "Milk", done: false, byId: "alice" });
    await f.doc("invites/GOODCODE").set({ listId: "L1", listName: "Groceries", createdBy: "alice", createdAt: Date.now() });
    await f.doc("invites/OLDCODE1").set({ listId: "L1", listName: "Groceries", createdBy: "alice", createdAt: Date.now() - 8 * DAY });
  });
});

// Private data
test("you can read and write your own data", async () => {
  await assertSucceeds(db("alice").doc("users/alice/tasks/t1").get());
  await assertSucceeds(db("alice").doc("users/alice/tasks/t2").set({ title: "New" }));
});
test("nobody else can read or write your data", async () => {
  await assertFails(db("bob").doc("users/alice/tasks/t1").get());
  await assertFails(db("bob").doc("users/alice/tasks/t9").set({ title: "Hack" }));
  await assertFails(db(null).doc("users/alice/tasks/t1").get());
  await assertFails(db("bob").collection("users").get());
});
test("anything outside the known paths is blocked", async () => {
  await assertFails(db("alice").doc("other/x").set({ a: 1 }));
  await assertFails(db("alice").collection("shared").get());
});

// Shared lists: members
test("members can read the list and add, tick and remove items", async () => {
  await assertSucceeds(list("bob").get());
  await assertSucceeds(list("bob").collection("items").doc("i2").set({ name: "Eggs", done: false, byId: "bob" }));
  await assertSucceeds(list("bob").collection("items").doc("i1").update({ done: true, doneBy: "Bob" }));
  await assertSucceeds(list("bob").collection("items").doc("i1").delete());
});
test("non-members can't see the list or its items", async () => {
  await assertFails(list("carol").get());
  await assertFails(list("carol").collection("items").get());
  await assertFails(list("carol").collection("items").doc("x").set({ name: "Spam" }));
});
test("a member can leave", async () => {
  await assertSucceeds(list("bob").update({ members: ["alice"] }));
});
test("a member can't rename the list", async () => {
  await assertFails(list("bob").update({ name: "Mine now" }));
});
test("a member can't take ownership", async () => {
  await assertFails(list("bob").update({ owner: "bob" }));
});
test("a member can't remove other people", async () => {
  await assertFails(list("bob").update({ members: ["bob"] }));
});
test("a member can't add people without an invite", async () => {
  await assertFails(list("bob").update({ members: ["alice", "bob", "carol"] }));
});
test("a member can't delete the list", async () => {
  await assertFails(list("bob").delete());
});

// Shared lists: owner
test("the owner can rename and delete the list", async () => {
  await assertSucceeds(list("alice").update({ name: "Family shop" }));
  await assertSucceeds(list("alice").delete());
});
test("the owner can't hand ownership away or remove themselves", async () => {
  await assertFails(list("alice").update({ owner: "bob" }));
  await assertFails(list("alice").update({ members: ["bob"] }));
});
test("you can only create a list you own, with yourself as the only member", async () => {
  await assertSucceeds(db("carol").doc("shared/L2").set({ name: "Mine", owner: "carol", members: ["carol"], memberInfo: { carol: info("Carol") } }));
  await assertFails(db("carol").doc("shared/L3").set({ name: "Fake", owner: "alice", members: ["carol"] }));
  await assertFails(db("carol").doc("shared/L4").set({ name: "Grab", owner: "carol", members: ["carol", "bob"] }));
});

// Invites and joining
test("joining with a valid code adds only you", async () => {
  await assertSucceeds(db("carol").doc("invites/GOODCODE").get());
  await assertSucceeds(list("carol").update({ members: ["alice", "bob", "carol"], "memberInfo.carol": info("Carol"), joinCode: "GOODCODE" }));
});
test("joining can't change other members' names", async () => {
  await assertFails(list("carol").update({ members: ["alice", "bob", "carol"], "memberInfo.carol": info("Carol"), "memberInfo.bob": info("Hacked"), joinCode: "GOODCODE" }));
});
test("joining with a wrong code fails", async () => {
  await assertFails(list("carol").update({ members: ["alice", "bob", "carol"], "memberInfo.carol": info("Carol"), joinCode: "NOPENOPE" }));
});
test("invite codes expire after 7 days", async () => {
  await assertFails(db("carol").doc("invites/OLDCODE1").get());
  await assertFails(list("carol").update({ members: ["alice", "bob", "carol"], "memberInfo.carol": info("Carol"), joinCode: "OLDCODE1" }));
});
test("invite codes can't be listed, only looked up", async () => {
  await assertFails(db("carol").collection("invites").get());
  await assertFails(db(null).doc("invites/GOODCODE").get());
});
test("only members can create invites, and they can't be back-dated or made to last longer", async () => {
  await assertSucceeds(db("bob").doc("invites/NEWCODE1").set({ listId: "L1", listName: "Groceries", createdBy: "bob", createdAt: Date.now() }));
  await assertFails(db("carol").doc("invites/NEWCODE2").set({ listId: "L1", listName: "Groceries", createdBy: "carol", createdAt: Date.now() }));
  await assertFails(db("bob").doc("invites/NEWCODE3").set({ listId: "L1", listName: "Groceries", createdBy: "bob", createdAt: Date.now() + 30 * DAY }));
});
