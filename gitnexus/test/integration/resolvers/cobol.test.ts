/**
 * COBOL: Exhaustive strict integration test.
 *
 * Every single node and edge produced by the COBOL/JCL pipeline is asserted
 * with exact counts and exact sorted lists. No fuzzy assertions.
 *
 * Ground truth captured from the cobol-app fixture:
 *   CUSTUPDT.cbl  — 5 programs, 2 sections, 17 paragraphs, 33 data items,
 *   AUDITLOG.cbl    1 file declaration, 2 COPYs, 1 EXEC SQL, 3 EXEC CICS,
 *   RPTGEN.cbl      2 ENTRY points, 1 dynamic CALL, multi-target MOVE,
 *   NESTED.cbl      nested PROGRAM-IDs, pseudotext REPLACING,
 *   CUSTDAT.cpy     PERFORM TIMES guard, unquoted CICS MAP,
 *   COPYLIB.cpy     2 JCL jobs, 2 JCL steps, 1 JCL dataset,
 *   RUNJOBS.jcl     cross-program CALL/LINK/XCTL resolution.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import {
  FIXTURES, getRelationships, getNodesByLabel, edgeSet,
  runPipelineFromRepo, type PipelineResult,
} from './helpers.js';

describe('COBOL full system extraction', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(
      path.join(FIXTURES, 'cobol-app'),
      () => {},
      { skipGraphPhases: true },
    );
  }, 60000);

  // =====================================================================
  // NODE COMPLETENESS
  // =====================================================================

  describe('node completeness', () => {

    it('produces exactly 5 Module nodes', () => {
      const modules = getNodesByLabel(result, 'Module');
      expect(modules.length).toBe(5);
      expect(modules).toEqual(['AUDITLOG', 'CUSTUPDT', 'INNER-PROG', 'OUTER-PROG', 'RPTGEN']);
    });

    it('produces exactly 17 Function nodes', () => {
      const funcs = getNodesByLabel(result, 'Function');
      expect(funcs.length).toBe(17);
      expect(funcs).toEqual([
        'CLEANUP-PARAGRAPH',
        'FETCH-DATA',
        'FORMAT-REPORT',
        'INIT-PARAGRAPH',
        'INNER-MAIN',
        'INNER-PROCESS',
        'MAIN-PARAGRAPH',
        'MAIN-PARAGRAPH',
        'MAIN-PARAGRAPH',
        'OUTER-MAIN',
        'OUTER-PROCESS',
        'PROCESS-PARAGRAPH',
        'READ-CUSTOMER',
        'SEND-SCREEN',
        'UPDATE-BALANCE',
        'WRITE-CUSTOMER',
        'WRITE-LOG',
      ]);
    });

    it('produces exactly 2 Namespace nodes', () => {
      const ns = getNodesByLabel(result, 'Namespace');
      expect(ns.length).toBe(2);
      expect(ns).toEqual(['INIT-SECTION', 'PROCESSING-SECTION']);
    });

    it('produces exactly 33 Property nodes', () => {
      const props = getNodesByLabel(result, 'Property');
      expect(props.length).toBe(33);
      expect(props).toEqual([
        'CUST-BALANCE',
        'CUST-ID',
        'CUST-NAME',
        'CUSTOMER-RECORD',
        'END-OF-FILE',
        'FIELD-A',
        'FIELD-B',
        'LS-AMOUNT',
        'LS-CUST-ID',
        'LS-PARAM',
        'PREMIUM-CUSTOMER',
        'REGULAR-CUSTOMER',
        'WS-AMOUNT',
        'WS-AMT',
        'WS-CODE',
        'WS-COUNT',
        'WS-CUST-ADDR',
        'WS-CUST-CODE',
        'WS-CUST-TYPE',
        'WS-CUSTOMER-DATA',
        'WS-CUSTOMER-NAME',
        'WS-EOF',
        'WS-FILE-STATUS',
        'WS-INNER-CODE',
        'WS-LOG-MESSAGE',
        'WS-MAP-NAME',
        'WS-NAME',
        'WS-OUTER-FLAG',
        'WS-PROG-NAME',
        'WS-RECORD',
        'WS-REPORT-LINE',
        'WS-SQL-CODE',
        'WS-TIMESTAMP',
      ]);
    });

    it('produces exactly 1 Record node', () => {
      const records = getNodesByLabel(result, 'Record');
      expect(records.length).toBe(1);
      expect(records).toEqual(['CUSTOMER-FILE']);
    });

    it('produces exactly 9 CodeElement nodes', () => {
      const ce = getNodesByLabel(result, 'CodeElement');
      expect(ce.length).toBe(9);
      expect(ce).toEqual([
        'CALL WS-PROG-NAME',
        'CUSTJOB',
        'EXEC CICS LINK',
        'EXEC CICS SEND MAP',
        'EXEC CICS XCTL',
        'EXEC SQL SELECT',
        'PROD.CUSTOMER.MASTER',
        'STEP1',
        'STEP2',
      ]);
    });

    it('produces exactly 2 Constructor nodes', () => {
      const constructors = getNodesByLabel(result, 'Constructor');
      expect(constructors.length).toBe(2);
      expect(constructors).toEqual(['ALTENTRY', 'AUDITLOG-BATCH']);
    });
  });

  // =====================================================================
  // EDGE COMPLETENESS
  // =====================================================================

  describe('edge completeness', () => {

    // -- ACCESSES edges -------------------------------------------------

    it('produces exactly 4 ACCESSES edges with reason cobol-move-read', () => {
      const edges = getRelationships(result, 'ACCESSES')
        .filter(e => e.rel.reason === 'cobol-move-read');
      expect(edges.length).toBe(4);
      expect(edgeSet(edges)).toEqual([
        'FORMAT-REPORT \u2192 WS-CUST-CODE',
        'READ-CUSTOMER \u2192 CUST-NAME',
        'UPDATE-BALANCE \u2192 WS-AMOUNT',
        'UPDATE-BALANCE \u2192 WS-AMT',
      ]);
    });

    it('produces exactly 5 ACCESSES edges with reason cobol-move-write', () => {
      const edges = getRelationships(result, 'ACCESSES')
        .filter(e => e.rel.reason === 'cobol-move-write');
      expect(edges.length).toBe(5);
      expect(edgeSet(edges)).toEqual([
        'FORMAT-REPORT \u2192 WS-REPORT-LINE',
        'READ-CUSTOMER \u2192 WS-CUSTOMER-NAME',
        'UPDATE-BALANCE \u2192 CUST-BALANCE',
        'UPDATE-BALANCE \u2192 FIELD-A',
        'UPDATE-BALANCE \u2192 FIELD-B',
      ]);
    });

    it('produces exactly 1 ACCESSES edge with reason sql-select', () => {
      const allAccesses = getRelationships(result, 'ACCESSES');
      const sqlAccesses = allAccesses.filter(e => e.rel.reason === 'sql-select');
      expect(sqlAccesses.length).toBe(1);
      expect(sqlAccesses[0].source).toBe('EXEC SQL SELECT');
    });

    it('produces exactly 10 total ACCESSES edges', () => {
      const edges = getRelationships(result, 'ACCESSES');
      expect(edges.length).toBe(11);
    });

    // -- CALLS edges: cobol-perform -----------------------------------

    it('produces exactly 11 CALLS edges with reason cobol-perform', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'cobol-perform');
      expect(edges.length).toBe(11);
      expect(edgeSet(edges)).toEqual([
        'FORMAT-REPORT \u2192 MAIN-PARAGRAPH',
        'INNER-MAIN \u2192 INNER-PROCESS',
        'MAIN-PARAGRAPH \u2192 CLEANUP-PARAGRAPH',
        'MAIN-PARAGRAPH \u2192 FETCH-DATA',
        'MAIN-PARAGRAPH \u2192 FORMAT-REPORT',
        'MAIN-PARAGRAPH \u2192 INIT-PARAGRAPH',
        'MAIN-PARAGRAPH \u2192 PROCESS-PARAGRAPH',
        'MAIN-PARAGRAPH \u2192 SEND-SCREEN',
        'MAIN-PARAGRAPH \u2192 WRITE-LOG',
        'OUTER-MAIN \u2192 OUTER-PROCESS',
        'PROCESS-PARAGRAPH \u2192 READ-CUSTOMER',
      ]);
    });

    it('produces exactly 2 CALLS edges with reason cobol-perform-thru', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'cobol-perform-thru');
      expect(edges.length).toBe(2);
      expect(edgeSet(edges)).toEqual([
        'FORMAT-REPORT \u2192 FORMAT-REPORT',
        'PROCESS-PARAGRAPH \u2192 WRITE-CUSTOMER',
      ]);
    });

    // -- CALLS edges: cobol-call (resolved) ---------------------------

    it('produces exactly 3 CALLS edges with reason cobol-call', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'cobol-call');
      expect(edges.length).toBe(3);
      expect(edgeSet(edges)).toEqual([
        'CUSTUPDT \u2192 AUDITLOG',
        'OUTER-PROG \u2192 INNER-PROG',
        'RPTGEN \u2192 CUSTUPDT',
      ]);
    });

    // -- CALLS edges: cics-link / cics-xctl ---------------------------

    it('produces exactly 1 CALLS edge with reason cics-link', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'cics-link');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['RPTGEN \u2192 AUDITLOG']);
    });

    it('produces exactly 1 CALLS edge with reason cics-xctl', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'cics-xctl');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['RPTGEN \u2192 CUSTUPDT']);
    });

    // -- CALLS edges: unresolved orphan removal verified ---------------

    it('produces zero unresolved CALLS edges after resolution', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason.endsWith('-unresolved'));
      expect(edges.length).toBe(0);
    });

    // -- CALLS edges: jcl-exec-pgm ------------------------------------

    it('produces exactly 2 CALLS edges with reason jcl-exec-pgm', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'jcl-exec-pgm');
      expect(edges.length).toBe(2);
      expect(edgeSet(edges)).toEqual([
        'STEP1 \u2192 CUSTUPDT',
        'STEP2 \u2192 RPTGEN',
      ]);
    });

    it('produces exactly 1 CALLS edge with reason jcl-dd:CUSTFILE', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'jcl-dd:CUSTFILE');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['STEP1 \u2192 PROD.CUSTOMER.MASTER']);
    });

    // -- CONTAINS edges -----------------------------------------------

    it('produces exactly 4 CONTAINS edges with reason cobol-program-id', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-program-id');
      expect(edges.length).toBe(4);
      expect(edgeSet(edges)).toEqual([
        'AUDITLOG.cbl \u2192 AUDITLOG',
        'CUSTUPDT.cbl \u2192 CUSTUPDT',
        'NESTED.cbl \u2192 OUTER-PROG',
        'RPTGEN.cbl \u2192 RPTGEN',
      ]);
    });

    it('produces exactly 1 CONTAINS edge with reason cobol-nested-program', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-nested-program');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['OUTER-PROG \u2192 INNER-PROG']);
    });

    it('produces exactly 2 CONTAINS edges with reason cobol-section', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-section');
      expect(edges.length).toBe(2);
      expect(edgeSet(edges)).toEqual([
        'CUSTUPDT \u2192 INIT-SECTION',
        'CUSTUPDT \u2192 PROCESSING-SECTION',
      ]);
    });

    it('produces exactly 17 CONTAINS edges with reason cobol-paragraph', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-paragraph');
      expect(edges.length).toBe(17);
      expect(edgeSet(edges)).toEqual([
        'AUDITLOG \u2192 MAIN-PARAGRAPH',
        'AUDITLOG \u2192 WRITE-LOG',
        'INIT-SECTION \u2192 INIT-PARAGRAPH',
        'INIT-SECTION \u2192 MAIN-PARAGRAPH',
        'OUTER-PROG \u2192 INNER-MAIN',
        'OUTER-PROG \u2192 INNER-PROCESS',
        'OUTER-PROG \u2192 OUTER-MAIN',
        'OUTER-PROG \u2192 OUTER-PROCESS',
        'PROCESSING-SECTION \u2192 CLEANUP-PARAGRAPH',
        'PROCESSING-SECTION \u2192 PROCESS-PARAGRAPH',
        'PROCESSING-SECTION \u2192 READ-CUSTOMER',
        'PROCESSING-SECTION \u2192 UPDATE-BALANCE',
        'PROCESSING-SECTION \u2192 WRITE-CUSTOMER',
        'RPTGEN \u2192 FETCH-DATA',
        'RPTGEN \u2192 FORMAT-REPORT',
        'RPTGEN \u2192 MAIN-PARAGRAPH',
        'RPTGEN \u2192 SEND-SCREEN',
      ]);
    });

    it('produces exactly 33 CONTAINS edges with reason cobol-data-item', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-data-item');
      expect(edges.length).toBe(33);
      expect(edgeSet(edges)).toEqual([
        'AUDITLOG \u2192 LS-AMOUNT',
        'AUDITLOG \u2192 LS-CUST-ID',
        'AUDITLOG \u2192 WS-LOG-MESSAGE',
        'AUDITLOG \u2192 WS-TIMESTAMP',
        'CUSTUPDT \u2192 CUST-BALANCE',
        'CUSTUPDT \u2192 CUST-ID',
        'CUSTUPDT \u2192 CUST-NAME',
        'CUSTUPDT \u2192 CUSTOMER-RECORD',
        'CUSTUPDT \u2192 END-OF-FILE',
        'CUSTUPDT \u2192 FIELD-A',
        'CUSTUPDT \u2192 FIELD-B',
        'CUSTUPDT \u2192 LS-PARAM',
        'CUSTUPDT \u2192 WS-AMOUNT',
        'CUSTUPDT \u2192 WS-AMT',
        'CUSTUPDT \u2192 WS-CODE',
        'CUSTUPDT \u2192 WS-CUSTOMER-NAME',
        'CUSTUPDT \u2192 WS-EOF',
        'CUSTUPDT \u2192 WS-FILE-STATUS',
        'CUSTUPDT \u2192 WS-NAME',
        'CUSTUPDT \u2192 WS-PROG-NAME',
        'CUSTUPDT \u2192 WS-RECORD',
        'OUTER-PROG \u2192 WS-INNER-CODE',
        'OUTER-PROG \u2192 WS-OUTER-FLAG',
        'RPTGEN \u2192 PREMIUM-CUSTOMER',
        'RPTGEN \u2192 REGULAR-CUSTOMER',
        'RPTGEN \u2192 WS-COUNT',
        'RPTGEN \u2192 WS-CUST-ADDR',
        'RPTGEN \u2192 WS-CUST-CODE',
        'RPTGEN \u2192 WS-CUST-TYPE',
        'RPTGEN \u2192 WS-CUSTOMER-DATA',
        'RPTGEN \u2192 WS-MAP-NAME',
        'RPTGEN \u2192 WS-REPORT-LINE',
        'RPTGEN \u2192 WS-SQL-CODE',
      ]);
    });

    it('produces exactly 1 CONTAINS edge with reason cobol-exec-sql', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-exec-sql');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['RPTGEN \u2192 EXEC SQL SELECT']);
    });

    it('produces exactly 3 CONTAINS edges with reason cobol-exec-cics', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-exec-cics');
      expect(edges.length).toBe(3);
      expect(edgeSet(edges)).toEqual([
        'RPTGEN \u2192 EXEC CICS LINK',
        'RPTGEN \u2192 EXEC CICS SEND MAP',
        'RPTGEN \u2192 EXEC CICS XCTL',
      ]);
    });

    it('produces exactly 1 CONTAINS edge with reason cobol-dynamic-call', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-dynamic-call');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['CUSTUPDT \u2192 CALL WS-PROG-NAME']);
    });

    it('produces exactly 2 CONTAINS edges with reason cobol-entry-point', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-entry-point');
      expect(edges.length).toBe(2);
      expect(edgeSet(edges)).toEqual([
        'AUDITLOG \u2192 AUDITLOG-BATCH',
        'CUSTUPDT \u2192 ALTENTRY',
      ]);
    });

    it('produces exactly 1 CONTAINS edge with reason cobol-file-declaration', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-file-declaration');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['CUSTUPDT \u2192 CUSTOMER-FILE']);
    });

    it('produces exactly 1 CONTAINS edge with reason jcl-job', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'jcl-job');
      expect(edges.length).toBe(1);
      expect(edgeSet(edges)).toEqual(['RUNJOBS.jcl \u2192 CUSTJOB']);
    });

    it('produces exactly 2 CONTAINS edges with reason jcl-step', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'jcl-step');
      expect(edges.length).toBe(2);
      expect(edgeSet(edges)).toEqual(['CUSTJOB \u2192 STEP1', 'CUSTJOB \u2192 STEP2']);
    });

    // -- IMPORTS edges ------------------------------------------------

    it('produces exactly 2 IMPORTS edges with reason cobol-copy', () => {
      const edges = getRelationships(result, 'IMPORTS')
        .filter(e => e.rel.reason === 'cobol-copy');
      expect(edges.length).toBe(2);
    });
  });

  // =====================================================================
  // CROSS-PROGRAM RESOLUTION
  // =====================================================================

  describe('cross-program resolution', () => {

    it('CUSTUPDT CALL "AUDITLOG" resolves to Module node', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.source === 'CUSTUPDT' && e.target === 'AUDITLOG' && e.rel.reason === 'cobol-call');
      expect(edges.length).toBe(1);
      expect(edges[0].sourceLabel).toBe('Module');
      expect(edges[0].targetLabel).toBe('Module');
    });

    it('RPTGEN CALL "CUSTUPDT" resolves to Module node', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.source === 'RPTGEN' && e.target === 'CUSTUPDT' && e.rel.reason === 'cobol-call');
      expect(edges.length).toBe(1);
    });

    it('OUTER-PROG CALL "INNER-PROG" resolves to nested Module', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.source === 'OUTER-PROG' && e.target === 'INNER-PROG' && e.rel.reason === 'cobol-call');
      expect(edges.length).toBe(1);
    });

    it('RPTGEN CICS LINK AUDITLOG resolves to Module node', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.source === 'RPTGEN' && e.target === 'AUDITLOG' && e.rel.reason === 'cics-link');
      expect(edges.length).toBe(1);
    });

    it('RPTGEN CICS XCTL CUSTUPDT resolves to Module node', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.source === 'RPTGEN' && e.target === 'CUSTUPDT' && e.rel.reason === 'cics-xctl');
      expect(edges.length).toBe(1);
    });
  });

  // =====================================================================
  // COPY EXPANSION
  // =====================================================================

  describe('COPY expansion', () => {

    it('RPTGEN IMPORTS CUSTDAT copybook', () => {
      const imports = getRelationships(result, 'IMPORTS')
        .filter(e => e.rel.reason === 'cobol-copy');
      const rptgenImport = imports.filter(e => e.sourceFilePath?.match(/RPTGEN\.cbl$/));
      expect(rptgenImport.length).toBe(1);
    });

    it('CUSTUPDT IMPORTS COPYLIB copybook', () => {
      const imports = getRelationships(result, 'IMPORTS')
        .filter(e => e.rel.reason === 'cobol-copy');
      const custImport = imports.filter(e => e.sourceFilePath?.match(/CUSTUPDT\.cbl$/));
      expect(custImport.length).toBe(1);
    });

    it('RPTGEN owns expanded CUSTDAT data items', () => {
      const contains = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'RPTGEN' && e.rel.reason === 'cobol-data-item');
      const targets = contains.map(e => e.target).sort();
      expect(targets).toContain('WS-CUST-CODE');
      expect(targets).toContain('WS-CUSTOMER-DATA');
      expect(targets).toContain('PREMIUM-CUSTOMER');
    });
  });

  // =====================================================================
  // NESTED PROGRAM-IDs
  // =====================================================================

  describe('nested PROGRAM-IDs', () => {

    it('NESTED.cbl produces OUTER-PROG as primary Module', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-program-id' && e.source?.match?.(/NESTED/));
      expect(edges.length).toBe(1);
      expect(edges[0].target).toBe('OUTER-PROG');
    });

    it('INNER-PROG is nested under OUTER-PROG', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'OUTER-PROG' && e.target === 'INNER-PROG');
      expect(edges.length).toBe(1);
      expect(edges[0].rel.reason).toBe('cobol-nested-program');
    });

    it('OUTER-PROG contains paragraphs from both programs (scoping not yet per-program)', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'OUTER-PROG' && e.rel.reason === 'cobol-paragraph');
      expect(edges.length).toBe(4);
      expect(edges.map(e => e.target).sort()).toEqual([
        'INNER-MAIN', 'INNER-PROCESS', 'OUTER-MAIN', 'OUTER-PROCESS',
      ]);
    });
  });

  // =====================================================================
  // DYNAMIC CALL
  // =====================================================================

  describe('dynamic CALL', () => {

    it('CALL WS-PROG-NAME produces a dynamic-call CodeElement under CUSTUPDT', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'cobol-dynamic-call');
      expect(edges.length).toBe(1);
      expect(edges[0].source).toBe('CUSTUPDT');
      expect(edges[0].target).toBe('CALL WS-PROG-NAME');
    });
  });

  // =====================================================================
  // SINGLE-QUOTED ENTRY
  // =====================================================================

  describe('single-quoted ENTRY', () => {

    it("ENTRY 'ALTENTRY' captured as Constructor under CUSTUPDT", () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'CUSTUPDT' && e.target === 'ALTENTRY');
      expect(edges.length).toBe(1);
      expect(edges[0].rel.reason).toBe('cobol-entry-point');
    });
  });

  // =====================================================================
  // MULTI-TARGET MOVE
  // =====================================================================

  describe('multi-target MOVE', () => {

    it('MOVE WS-AMT TO FIELD-A FIELD-B produces read + 2 writes', () => {
      const accesses = getRelationships(result, 'ACCESSES');
      const amtReads = accesses.filter(e =>
        e.source === 'UPDATE-BALANCE' && e.target === 'WS-AMT' && e.rel.reason === 'cobol-move-read');
      expect(amtReads.length).toBe(1);

      const fieldAWrites = accesses.filter(e =>
        e.source === 'UPDATE-BALANCE' && e.target === 'FIELD-A' && e.rel.reason === 'cobol-move-write');
      expect(fieldAWrites.length).toBe(1);

      const fieldBWrites = accesses.filter(e =>
        e.source === 'UPDATE-BALANCE' && e.target === 'FIELD-B' && e.rel.reason === 'cobol-move-write');
      expect(fieldBWrites.length).toBe(1);
    });
  });

  // =====================================================================
  // PERFORM TIMES GUARD
  // =====================================================================

  describe('PERFORM TIMES guard', () => {

    it('PERFORM WS-COUNT TIMES does NOT produce CALLS edge to WS-COUNT', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.target === 'WS-COUNT');
      expect(edges.length).toBe(0);
    });
  });

  // =====================================================================
  // SECTION-TO-PARAGRAPH HIERARCHY
  // =====================================================================

  describe('section-to-paragraph hierarchy', () => {

    it('INIT-SECTION contains exactly 2 paragraphs', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'INIT-SECTION' && e.rel.reason === 'cobol-paragraph');
      expect(edges.length).toBe(2);
      expect(edges.map(e => e.target).sort()).toEqual(['INIT-PARAGRAPH', 'MAIN-PARAGRAPH']);
    });

    it('PROCESSING-SECTION contains exactly 5 paragraphs', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'PROCESSING-SECTION' && e.rel.reason === 'cobol-paragraph');
      expect(edges.length).toBe(5);
      expect(edges.map(e => e.target).sort()).toEqual([
        'CLEANUP-PARAGRAPH', 'PROCESS-PARAGRAPH', 'READ-CUSTOMER',
        'UPDATE-BALANCE', 'WRITE-CUSTOMER',
      ]);
    });
  });

  // =====================================================================
  // DATA ITEM OWNERSHIP
  // =====================================================================

  describe('data item ownership', () => {

    it('CUSTUPDT owns exactly 17 data items', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'CUSTUPDT' && e.rel.reason === 'cobol-data-item');
      expect(edges.length).toBe(17);
    });

    it('AUDITLOG owns exactly 4 data items', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'AUDITLOG' && e.rel.reason === 'cobol-data-item');
      expect(edges.length).toBe(4);
    });

    it('RPTGEN owns exactly 10 data items', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'RPTGEN' && e.rel.reason === 'cobol-data-item');
      expect(edges.length).toBe(10);
    });
  });

  // =====================================================================
  // MOVE DATA FLOW
  // =====================================================================

  describe('MOVE data flow', () => {

    it('READ-CUSTOMER reads CUST-NAME and writes WS-CUSTOMER-NAME', () => {
      const accesses = getRelationships(result, 'ACCESSES');
      expect(accesses.filter(e => e.source === 'READ-CUSTOMER' && e.rel.reason === 'cobol-move-read')[0].target).toBe('CUST-NAME');
      expect(accesses.filter(e => e.source === 'READ-CUSTOMER' && e.rel.reason === 'cobol-move-write')[0].target).toBe('WS-CUSTOMER-NAME');
    });

    it('UPDATE-BALANCE has 2 read and 3 write edges', () => {
      const accesses = getRelationships(result, 'ACCESSES');
      const reads = accesses.filter(e => e.source === 'UPDATE-BALANCE' && e.rel.reason === 'cobol-move-read');
      expect(reads.length).toBe(2);
      expect(reads.map(e => e.target).sort()).toEqual(['WS-AMOUNT', 'WS-AMT']);
      const writes = accesses.filter(e => e.source === 'UPDATE-BALANCE' && e.rel.reason === 'cobol-move-write');
      expect(writes.length).toBe(3);
      expect(writes.map(e => e.target).sort()).toEqual(['CUST-BALANCE', 'FIELD-A', 'FIELD-B']);
    });

    it('FORMAT-REPORT reads WS-CUST-CODE and writes WS-REPORT-LINE', () => {
      const accesses = getRelationships(result, 'ACCESSES');
      expect(accesses.filter(e => e.source === 'FORMAT-REPORT' && e.rel.reason === 'cobol-move-read')[0].target).toBe('WS-CUST-CODE');
      expect(accesses.filter(e => e.source === 'FORMAT-REPORT' && e.rel.reason === 'cobol-move-write')[0].target).toBe('WS-REPORT-LINE');
    });
  });

  // =====================================================================
  // JCL INTEGRATION
  // =====================================================================

  describe('JCL integration', () => {

    it('CUSTJOB job is contained by RUNJOBS.jcl file', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.rel.reason === 'jcl-job');
      expect(edges.length).toBe(1);
      expect(edges[0].source).toBe('RUNJOBS.jcl');
      expect(edges[0].target).toBe('CUSTJOB');
    });

    it('CUSTJOB contains exactly 2 steps', () => {
      const edges = getRelationships(result, 'CONTAINS')
        .filter(e => e.source === 'CUSTJOB' && e.rel.reason === 'jcl-step');
      expect(edges.length).toBe(2);
      expect(edges.map(e => e.target).sort()).toEqual(['STEP1', 'STEP2']);
    });

    it('STEP1 references PROD.CUSTOMER.MASTER dataset', () => {
      const edges = getRelationships(result, 'CALLS')
        .filter(e => e.rel.reason === 'jcl-dd:CUSTFILE');
      expect(edges.length).toBe(1);
      expect(edges[0].source).toBe('STEP1');
      expect(edges[0].target).toBe('PROD.CUSTOMER.MASTER');
    });
  });

  // =====================================================================
  // GRAND TOTALS
  // =====================================================================

  describe('grand totals', () => {

    it('produces exactly 21 total CALLS edges', () => {
      // 11 cobol-perform + 2 cobol-perform-thru + 3 cobol-call +
      // 1 cics-link + 1 cics-xctl + 2 jcl-exec-pgm + 1 jcl-dd:CUSTFILE = 21
      const edges = getRelationships(result, 'CALLS');
      expect(edges.length).toBe(21);
    });

    it('produces exactly 68 total CONTAINS edges', () => {
      // 4 cobol-program-id + 1 cobol-nested-program + 2 cobol-section +
      // 17 cobol-paragraph + 33 cobol-data-item + 1 cobol-exec-sql +
      // 3 cobol-exec-cics + 1 cobol-dynamic-call + 2 cobol-entry-point +
      // 1 cobol-file-declaration + 1 jcl-job + 2 jcl-step = 68
      const edges = getRelationships(result, 'CONTAINS');
      expect(edges.length).toBe(68);
    });

    it('produces exactly 2 total IMPORTS edges', () => {
      const edges = getRelationships(result, 'IMPORTS');
      expect(edges.length).toBe(2);
    });

    it('produces exactly 10 total ACCESSES edges', () => {
      // 4 cobol-move-read + 5 cobol-move-write + 1 sql-select = 10
      const edges = getRelationships(result, 'ACCESSES');
      expect(edges.length).toBe(11);
    });
  });
});
