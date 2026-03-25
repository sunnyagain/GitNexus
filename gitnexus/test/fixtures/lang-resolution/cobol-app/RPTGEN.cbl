       IDENTIFICATION DIVISION.
       PROGRAM-ID. RPTGEN.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
           COPY CUSTDAT.
       01 WS-REPORT-LINE           PIC X(132).
       01 WS-SQL-CODE              PIC S9(9) COMP.
       01 WS-COUNT                 PIC 9(4).
       01 WS-MAP-NAME              PIC X(8).

       PROCEDURE DIVISION.
       MAIN-PARAGRAPH.
           PERFORM FETCH-DATA
           PERFORM FORMAT-REPORT
           PERFORM SEND-SCREEN
           CALL "CUSTUPDT"
           STOP RUN.

       FETCH-DATA.
           EXEC SQL
               SELECT CUST_NAME, CUST_BALANCE
               FROM CUSTOMER
               WHERE CUST_ID = :WS-CUST-CODE
           END-EXEC.

       FORMAT-REPORT.
           PERFORM WS-COUNT TIMES
               MOVE WS-CUST-CODE TO WS-REPORT-LINE
           END-PERFORM
           PERFORM MAIN-PARAGRAPH THRU FORMAT-REPORT.

       SEND-SCREEN.
           EXEC CICS
               SEND MAP(WS-MAP-NAME) MAPSET('CUSTSET')
           END-EXEC.

           EXEC CICS
               LINK PROGRAM('AUDITLOG')
           END-EXEC.

           EXEC CICS
               XCTL PROGRAM('CUSTUPDT')
           END-EXEC.
