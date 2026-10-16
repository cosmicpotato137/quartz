import test, { describe } from "node:test"
import assert from "node:assert"
import { renderTranscludes, removeBrokenLinks, pageResources } from "./renderPage"
import { Root, Element, ElementContent } from "hast"
import { FullSlug } from "../util/path"
import { GlobalConfiguration } from "../cfg"
import { QuartzComponentProps } from "./types"
import { StaticResources } from "../util/resources"

function makeTranscludeBlockquote(targetSlug: string, block?: string): Element {
  return {
    type: "element",
    tagName: "blockquote",
    properties: {
      className: ["transclude"],
      ...(block ? { dataBlock: block } : {}),
    },
    children: [
      {
        type: "element",
        tagName: "a",
        properties: {
          href: `./${targetSlug}`,
          "data-slug": targetSlug,
          className: ["transclude-inner"],
        },
        children: [{ type: "text", value: `Transclude of ${targetSlug}` }],
      },
    ],
  }
}

function makePageData(slug: string, htmlAst: Root, extra?: Record<string, unknown>) {
  return {
    slug: slug as FullSlug,
    htmlAst,
    frontmatter: { title: slug, tags: [] },
    ...extra,
  } as unknown as QuartzComponentProps["allFiles"][number]
}

const cfg = { locale: "en-US" } as GlobalConfiguration

function makeComponentData(
  allFiles: QuartzComponentProps["allFiles"],
): Pick<QuartzComponentProps, "allFiles" | "cfg"> {
  return { allFiles, cfg } as unknown as QuartzComponentProps
}

describe("renderTranscludes", () => {
  test("resolves a single page transclusion", () => {
    const root: Root = {
      type: "root",
      children: [makeTranscludeBlockquote("target")],
    }

    const targetHtml: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Target content" }],
        },
      ],
    }

    const allFiles = [makePageData("target", targetHtml)]
    const visited = new Set<FullSlug>(["current" as FullSlug])
    renderTranscludes(
      root,
      cfg,
      "current" as FullSlug,
      makeComponentData(allFiles) as QuartzComponentProps,
      visited,
    )

    const bq = root.children[0] as Element
    const texts = JSON.stringify(bq.children)
    assert.ok(texts.includes("Target content"), "transcluded content should be inlined")
  })

  test("allows the same page to be embedded twice as siblings", () => {
    const root: Root = {
      type: "root",
      children: [makeTranscludeBlockquote("target"), makeTranscludeBlockquote("target")],
    }

    const targetHtml: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Duplicated content" }],
        },
      ],
    }

    const allFiles = [makePageData("target", targetHtml)]
    const visited = new Set<FullSlug>(["current" as FullSlug])
    renderTranscludes(
      root,
      cfg,
      "current" as FullSlug,
      makeComponentData(allFiles) as QuartzComponentProps,
      visited,
    )

    const first = root.children[0] as Element
    const second = root.children[1] as Element
    const firstText = JSON.stringify(first.children)
    const secondText = JSON.stringify(second.children)
    assert.ok(firstText.includes("Duplicated content"), "first embed should resolve")
    assert.ok(
      secondText.includes("Duplicated content"),
      "second embed should resolve, not be rejected as circular",
    )
    assert.ok(!secondText.includes("Circular transclusion"), "should not show circular warning")
  })

  test("allows different sections of the same page to be embedded", () => {
    const root: Root = {
      type: "root",
      children: [
        makeTranscludeBlockquote("target", "#intro"),
        makeTranscludeBlockquote("target", "#details"),
      ],
    }

    const targetHtml: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h2",
          properties: { id: "intro" },
          children: [{ type: "text", value: "Intro" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Intro text" }],
        },
        {
          type: "element",
          tagName: "h2",
          properties: { id: "details" },
          children: [{ type: "text", value: "Details" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Details text" }],
        },
      ],
    }

    const allFiles = [makePageData("target", targetHtml)]
    const visited = new Set<FullSlug>(["current" as FullSlug])
    renderTranscludes(
      root,
      cfg,
      "current" as FullSlug,
      makeComponentData(allFiles) as QuartzComponentProps,
      visited,
    )

    const first = root.children[0] as Element
    const second = root.children[1] as Element
    const firstText = JSON.stringify(first.children)
    const secondText = JSON.stringify(second.children)
    assert.ok(firstText.includes("Intro text"), "first header section should resolve")
    assert.ok(
      !firstText.includes("Details text"),
      "first section should not include second section",
    )
    assert.ok(secondText.includes("Details text"), "second header section should resolve")
    assert.ok(!secondText.includes("Circular transclusion"), "should not show circular warning")
  })

  test("detects actual circular transclusion (A -> B -> A)", () => {
    // Page A embeds B, and B's htmlAst contains a transclusion of A
    const bTranscludesA = makeTranscludeBlockquote("pageA")
    const pageB_htmlAst: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Page B content" }],
        },
        bTranscludesA,
      ],
    }

    const pageA_htmlAst: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Page A content" }],
        },
      ],
    }

    const root: Root = {
      type: "root",
      children: [makeTranscludeBlockquote("pageB")],
    }

    const allFiles = [makePageData("pageA", pageA_htmlAst), makePageData("pageB", pageB_htmlAst)]

    const visited = new Set<FullSlug>(["pageA" as FullSlug])
    renderTranscludes(
      root,
      cfg,
      "pageA" as FullSlug,
      makeComponentData(allFiles) as QuartzComponentProps,
      visited,
    )

    const bq = root.children[0] as Element
    const fullText = JSON.stringify(bq.children)
    assert.ok(fullText.includes("Page B content"), "page B content should be inlined")
    assert.ok(fullText.includes("Circular transclusion"), "circular A->B->A should be detected")
    assert.ok(!fullText.includes("Page A content"), "page A should not be re-inlined inside B")
  })

  test("self-referencing transclusion is blocked", () => {
    const root: Root = {
      type: "root",
      children: [makeTranscludeBlockquote("self")],
    }

    const selfHtml: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Self content" }],
        },
      ],
    }

    const allFiles = [makePageData("self", selfHtml)]
    const visited = new Set<FullSlug>(["self" as FullSlug])
    renderTranscludes(
      root,
      cfg,
      "self" as FullSlug,
      makeComponentData(allFiles) as QuartzComponentProps,
      visited,
    )

    const bq = root.children[0] as Element
    const text = JSON.stringify(bq.children)
    assert.ok(text.includes("Circular transclusion"), "self-reference should be blocked")
  })
})

describe("removeBrokenLinks", () => {
  function makeLink(targetSlug: string, text: string): Element {
    return {
      type: "element",
      tagName: "a",
      properties: {
        href: `./${targetSlug}`,
        "data-slug": targetSlug,
        className: ["internal", "internal-link"],
      },
      children: [{ type: "text", value: text }],
    }
  }

  function makeParagraph(...children: ElementContent[]): Element {
    return { type: "element", tagName: "p", properties: {}, children }
  }

  function makeLinkComponentData(
    allFiles: QuartzComponentProps["allFiles"],
    ctxFiles: string[] = [],
  ): QuartzComponentProps {
    return { allFiles, cfg, ctx: { allFiles: ctxFiles } } as unknown as QuartzComponentProps
  }

  const emptyHtml: Root = { type: "root", children: [] }

  test("unwraps links to pages that were not emitted into plain text", () => {
    const root: Root = {
      type: "root",
      children: [
        makeParagraph(
          { type: "text", value: "see " },
          makeLink("private-note", "Private Note"),
          { type: "text", value: " and " },
          makeLink("public-note", "Public Note"),
        ),
      ],
    }

    // private-note exists on disk (ctx.allFiles) but was filtered out of allFiles
    const componentData = makeLinkComponentData(
      [makePageData("public-note", emptyHtml)],
      ["private-note.md", "public-note.md"],
    )
    removeBrokenLinks(root, componentData)

    const p = root.children[0] as Element
    assert.deepStrictEqual(
      p.children.map((c) => (c.type === "element" ? c.tagName : c.type)),
      ["text", "text", "text", "a"],
    )
    assert.strictEqual((p.children[1] as { value: string }).value, "Private Note")
  })

  test("keeps links to aliases, virtual pages, and assets", () => {
    const root: Root = {
      type: "root",
      children: [
        makeParagraph(
          makeLink("other-name", "alias"),
          makeLink("folder/index", "folder"),
          makeLink("images/photo.png", "image"),
        ),
      ],
    }

    const componentData = makeLinkComponentData(
      [
        makePageData("note", emptyHtml, { aliases: ["other-name"] }),
        makePageData("folder/index", emptyHtml),
      ],
      ["note.md", "images/photo.png"],
    )
    removeBrokenLinks(root, componentData)

    const p = root.children[0] as Element
    assert.strictEqual(p.children.filter((c) => c.type === "element").length, 3)
  })

  test("leaves same-page anchors and external links alone", () => {
    const anchor: Element = {
      type: "element",
      tagName: "a",
      properties: { href: "#heading", className: ["internal"] },
      children: [{ type: "text", value: "heading" }],
    }
    const external: Element = {
      type: "element",
      tagName: "a",
      properties: { href: "https://example.com", className: ["external"] },
      children: [{ type: "text", value: "example" }],
    }
    const root: Root = { type: "root", children: [makeParagraph(anchor, external)] }

    removeBrokenLinks(root, makeLinkComponentData([]))

    const p = root.children[0] as Element
    assert.deepStrictEqual(p.children, [anchor, external])
  })

  test("removes embeds of pages that do not exist", () => {
    const root: Root = {
      type: "root",
      // an unresolved block on an existing page still links somewhere real, so it stays
      children: [
        makeTranscludeBlockquote("missing"),
        makeTranscludeBlockquote("present", "#^block"),
      ],
    }

    removeBrokenLinks(root, makeLinkComponentData([makePageData("present", emptyHtml)]))

    assert.strictEqual(root.children.length, 1)
    const remaining = (root.children[0] as Element).children[0] as Element
    assert.strictEqual(remaining.properties["data-slug"], "present")
  })
})

describe("pageResources", () => {
  const emptyResources: StaticResources = {
    css: [],
    js: [],
    additionalHead: [],
  }

  test("uses baseDir prefix for resource paths in production mode", () => {
    const result = pageResources("/quartz" as FullSlug, emptyResources)
    assert.ok(
      result.css[0].content.startsWith("/quartz/"),
      `expected css path to start with /quartz/, got: ${result.css[0].content}`,
    )
    const externalJs = result.js.find((j) => j.contentType === "external" && "src" in j)
    assert.ok(externalJs && "src" in externalJs)
    assert.ok(
      externalJs.src.startsWith("/quartz/"),
      `expected js src to start with /quartz/, got: ${externalJs.src}`,
    )
  })

  test("omits subpath prefix when baseDir is empty (serve mode)", () => {
    const result = pageResources("." as FullSlug, emptyResources)
    for (const css of result.css) {
      assert.ok(
        !css.content.includes("/quartz/"),
        `css path should not contain /quartz/, got: ${css.content}`,
      )
    }
    for (const js of result.js) {
      if (js.contentType === "external" && "src" in js) {
        assert.ok(
          !js.src.includes("/quartz/"),
          `js src should not contain /quartz/, got: ${js.src}`,
        )
      }
    }
  })

  test("contentIndex path reflects baseDir", () => {
    const withPrefix = pageResources("/quartz" as FullSlug, emptyResources)
    const inlineJs = withPrefix.js.find((j) => j.contentType === "inline" && "script" in j)
    assert.ok(inlineJs && "script" in inlineJs)
    assert.ok(
      inlineJs.script.includes("/quartz/static/contentIndex.json"),
      `expected contentIndex fetch to include /quartz/ prefix, got: ${inlineJs.script}`,
    )

    const withoutPrefix = pageResources("." as FullSlug, emptyResources)
    const inlineJsServe = withoutPrefix.js.find((j) => j.contentType === "inline" && "script" in j)
    assert.ok(inlineJsServe && "script" in inlineJsServe)
    assert.ok(
      !inlineJsServe.script.includes("/quartz/static/contentIndex.json"),
      `expected contentIndex fetch without /quartz/ prefix in serve mode, got: ${inlineJsServe.script}`,
    )
  })
})
