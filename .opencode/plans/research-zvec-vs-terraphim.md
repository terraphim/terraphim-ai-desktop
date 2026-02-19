# Research Document: zvec vs Terraphim Vector/Graph Search Comparison

**Status**: Draft
**Author**: Claude (AI Research Agent)
**Date**: 2026-02-16
**Reviewers**: TBD

## Executive Summary

zvec (Alibaba) and Terraphim take fundamentally different approaches to semantic search: **zvec is a dense/sparse vector database using neural embeddings with ANN (Approximate Nearest Neighbor) algorithms**, while **Terraphim uses graph-based co-occurrence embeddings with knowledge graph ranking**. zvec excels at large-scale neural embedding search; Terraphim excels at interpretable knowledge-graph-driven retrieval.

## Essential Questions Check

| Question | Answer | Evidence |
|----------|--------|----------|
| Energizing? | Yes | Understanding architectural differences helps inform future integration possibilities |
| Leverages strengths? | Yes | Terraphim's unique graph embedding approach offers complementary capabilities |
| Meets real need? | Yes | Users may want both neural embeddings AND knowledge graph ranking |

**Proceed**: Yes - 3/3 YES

## Problem Statement

### Description
Compare zvec's vector database implementation against Terraphim's RoleGraph system to understand architectural differences, strengths, and potential integration opportunities.

### Impact
- Informs architectural decisions for future Terraphim development
- Identifies gaps and opportunities in current implementation
- Helps users choose appropriate tools for their use cases

### Success Criteria
Clear understanding of:
1. Core architectural differences
2. Data structures and indexing approaches
3. Query semantics and ranking algorithms
4. Performance characteristics and tradeoffs

## Current State Analysis

### zvec Architecture (Alibaba)

**Language**: C++ core with Python/Node.js bindings (SWIG)
**Foundation**: Proxima (Alibaba's battle-tested vector search engine)

#### Core Data Model

```
Collection (like a database table)
  ├── id: string (unique document identifier)
  ├── vectors: named vector embeddings
  │   ├── Dense: VECTOR_FP16, VECTOR_FP32, VECTOR_INT8
  │   └── Sparse: SPARSE_VECTOR_FP32, SPARSE_VECTOR_FP16
  └── fields: named scalar fields (STRING, INT32, FLOAT, etc.)
```

#### Index Types

| Index Type | Description | Use Case |
|------------|-------------|----------|
| **Flat** | Brute-force exact search | Small datasets, high accuracy |
| **HNSW** | Hierarchical Navigable Small World | Large-scale ANN search |
| **IVF** | Inverted File Index | Clustered data, medium accuracy |
| **Inverted** | Traditional inverted index | Scalar field filtering |

#### Key Features

1. **Dense + Sparse Vectors**: Native support for both types in single query
2. **Hybrid Search**: Semantic similarity + structured filters
3. **Quantization**: INT8/FP16 compression for memory efficiency
4. **Reranking**: RRF (Reciprocal Rank Fusion), Weighted rerankers
5. **Embedding Functions**: Built-in OpenAI, Qwen, SentenceTransformers

#### Python API Example

```python
import zvec

schema = zvec.CollectionSchema(
    name="example",
    vectors=zvec.VectorSchema("embedding", zvec.DataType.VECTOR_FP32, 768),
)

collection = zvec.create_and_open(path="./data", schema=schema)

collection.insert([
    zvec.Doc(id="doc_1", vectors={"embedding": [0.1, 0.2, ...]}),
])

results = collection.query(
    zvec.VectorQuery("embedding", vector=[0.4, 0.3, ...]),
    topk=10,
    filter="category == 'tech'"
)
```

### Terraphim Architecture

**Language**: Rust
**Foundation**: Custom knowledge graph with co-occurrence embeddings

#### Core Data Model

```
RoleGraph (per role/persona)
  ├── thesaurus: NormalizedTermValue -> NormalizedTerm
  ├── nodes: node_id -> Node (concept with connections)
  ├── edges: edge_id -> Edge (relationship between concepts)
  └── documents: doc_id -> IndexedDocument

Document
  ├── id: string
  ├── title, body, description
  ├── tags (from graph nodes)
  └── rank (from graph traversal)
```

#### Relevance Functions

| Function | Description | Use Case |
|----------|-------------|----------|
| **TerraphimGraph** | Knowledge graph ranking | Domain-specific semantic search |
| **TitleScorer** | Title-based relevance | Quick document matching |
| **BM25** | Classic BM25 probabilistic | General text search |
| **BM25F** | Field-weighted BM25 | Multi-field documents |
| **BM25Plus** | Enhanced BM25 with parameters | Fine-tuned ranking |

#### Key Features

1. **Graph Embeddings**: Co-occurrence based, NOT neural embeddings
2. **Aho-Corasick Automata**: Fast multi-pattern matching for thesaurus
3. **Knowledge Graph**: Node/edge relationships for semantic ranking
4. **Thesaurus Expansion**: Synonyms map to normalized concepts
5. **Role-Based Search**: Different graphs for different personas

#### Rust Core (RoleGraph)

```rust
pub struct RoleGraph {
    pub role: RoleName,
    nodes: AHashMap<u64, Node>,
    edges: AHashMap<u64, Edge>,
    documents: AHashMap<String, IndexedDocument>,
    pub thesaurus: Thesaurus,
    pub ac: AhoCorasick,  // Fast pattern matching
}

pub fn query_graph(&self, query_string: &str) -> Vec<(String, IndexedDocument)> {
    let node_ids = self.find_matching_node_ids(query_string);
    // Traverse graph, aggregate node+edge+doc ranks
    // Return ranked documents
}
```

## Constraint Comparison

### Technical Constraints

| Aspect | zvec | Terraphim |
|--------|------|-----------|
| **Embedding Type** | Neural (dense/sparse) | Graph co-occurrence |
| **Similarity Metric** | Cosine, L2, Dot Product | Graph traversal rank |
| **Index Structure** | HNSW/IVF/Flat | Hash maps + Aho-Corasick |
| **Persistence** | Disk-based collection | JSON serialization |
| **Scale** | Billions of vectors | Thousands of documents |
| **Query Speed** | Milliseconds (10M+ vectors) | Fast (in-memory graph) |
| **Interpretability** | Low (opaque vectors) | High (explainable graph) |

### Architectural Constraints

| Aspect | zvec | Terraphim |
|--------|------|-----------|
| **Deployment** | In-process library | In-process service |
| **Dependencies** | C++ core, SWIG bindings | Pure Rust |
| **Schema** | Dynamic, strongly typed | Role-based, flexible |
| **Filtering** | SQL-like expressions | Graph-based term expansion |

## Vital Few (Essentialism)

### Essential Differences (Max 3)

| Constraint | Why It's Vital | Evidence |
|------------|----------------|----------|
| **Embedding Type** | Neural vs Graph = fundamentally different use cases | zvec: dense vectors from LLMs; Terraphim: co-occurrence graph |
| **Interpretability** | Graph shows WHY docs match; vectors are opaque | Terraphim nodes/edges explain relevance |
| **Scale Target** | zvec: billions; Terraphim: thousands | zvec benchmarks: 10M vectors; Terraphim: personal knowledge |

### Eliminated from Scope

| Eliminated Item | Why Eliminated |
|-----------------|----------------|
| Detailed benchmark comparison | Not same use case scale |
| Integration implementation | Research only, no design yet |
| Cost analysis | Open source both |
| Enterprise features comparison | Focus on core architecture |

## Dependencies

### zvec Dependencies

| Dependency | Purpose | Risk |
|------------|---------|------|
| Proxima (Alibaba) | Core vector engine | Proprietary but open-sourced |
| ANTLR | SQL parser | Low risk, stable |
| CMake | Build system | Low risk |
| pybind11/SWIG | Python bindings | Low risk |

### Terraphim Dependencies

| Dependency | Purpose | Risk |
|------------|---------|------|
| aho-corasick | Pattern matching | Low risk, pure Rust |
| tokio | Async runtime | Low risk |
| serde | Serialization | Low risk |
| terraphim_automata | Term normalization | Internal, low risk |

## Risks and Unknowns

### Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Different paradigms = no direct replacement | High | High | Use as complementary tools |
| Graph scaling limits | Medium | Medium | Consider hybrid approach |
| Neural embedding quality varies | Medium | Medium | Use domain-specific models |

### Open Questions

1. **Could Terraphim benefit from sparse BM25 embeddings like zvec's BM25EmbeddingFunction?** - Research needed
2. **Would hybrid search (graph + neural) improve Terraphim results?** - Spike needed
3. **Can zvec's HNSW be used for Terraphim's graph node clustering?** - Investigation needed

### Assumptions Explicitly Stated

| Assumption | Basis | Risk if Wrong | Verified? |
|------------|-------|---------------|-----------|
| zvec targets different use case | Documentation, benchmarks | Low | Yes |
| Terraphim graph approach is unique | No other graph-based search found | Medium | Partial |
| Both can coexist | Different architectures | Low | Yes |

## Research Findings

### Key Insights

1. **Different Paradigms, Same Goal**:
   - zvec: Transform data → neural embeddings → ANN search
   - Terraphim: Extract terms → build graph → traverse for relevance

2. **Interpretability Trade-off**:
   - zvec: Fast but opaque (why did this match?)
   - Terraphim: Explainable (matched via node X, edge Y, document Z)

3. **Scale vs. Depth**:
   - zvec: Optimized for massive scale (10M+ vectors)
   - Terraphim: Optimized for knowledge depth (semantic relationships)

4. **Embedding Quality**:
   - zvec: Depends on embedding model quality
   - Terraphim: Depends on thesaurus/domain knowledge quality

### Architectural Comparison Diagram

```
zvec Flow:
  Document → Embedding Model → Dense Vector → HNSW Index → ANN Query
                                                        ↓
  Query → Embedding Model → Query Vector ──────────────→ Top-K Results

Terraphim Flow:
  Document → Term Extraction → Co-occurrence → Graph (Nodes/Edges)
                                                      ↓
  Query → Aho-Corasick Match → Graph Traversal ──────→ Ranked Results
```

### When to Use Which

| Use Case | Recommendation | Rationale |
|----------|----------------|-----------|
| Large-scale semantic search (web, e-commerce) | zvec | ANN scalability |
| Personal knowledge management | Terraphim | Explainable, domain-specific |
| RAG with LLMs | zvec | Dense embeddings match LLM embeddings |
| Domain-specific expert systems | Terraphim | Graph captures domain knowledge |
| Image/audio similarity | zvec | Dense embeddings required |
| Knowledge graph exploration | Terraphim | Native graph structure |

### Potential Integration Opportunities

1. **Hybrid Ranking**: Use zvec for initial ANN retrieval, Terraphim graph for reranking
2. **Sparse BM25**: Add zvec's BM25EmbeddingFunction to Terraphim's haystacks
3. **Graph-Enhanced Embeddings**: Use Terraphim graph to weight/modify dense embeddings
4. **Explainable AI**: Use Terraphim graph to explain zvec results

## Recommendations

### Proceed/No-Proceed
**Proceed with awareness**: These are complementary tools, not alternatives.

### Scope Recommendations
1. **Do NOT replace** Terraphim's graph with zvec's vector DB
2. **Consider** adding sparse vector support (BM25) to Terraphim
3. **Explore** hybrid search combining both approaches
4. **Document** when to use each system

### Risk Mitigation Recommendations
1. Clearly define use cases for each system
2. Consider A/B testing hybrid approaches
3. Maintain Terraphim's interpretability as core value proposition

## Next Steps

If approved for further investigation:
1. Create design document for hybrid search approach
2. Spike: Add BM25 sparse embeddings to Terraphim middleware
3. Benchmark: Compare Terraphim graph vs zvec on same corpus
4. Evaluate: Can Terraphim graph structure enhance zvec reranking?

## Appendix

### zvec Performance (from benchmarks)

- **Cohere 10M (768-dim)**: ~2000 QPS with 96% recall
- **Cohere 1M (768-dim)**: ~8000 QPS with 97% recall
- **Index Build**: Minutes for 10M vectors

### Terraphim Performance (observed)

- **Documents**: Optimized for thousands, not millions
- **Query**: In-memory graph traversal, sub-millisecond
- **Index Build**: Real-time as documents are processed

### Reference Materials

- zvec: https://github.com/alibaba/zvec
- zvec Docs: https://zvec.org/en/docs/
- Terraphim RoleGraph: `crates/terraphim_rolegraph/src/lib.rs`
- Terraphim Types: `crates/terraphim_types/src/lib.rs`
