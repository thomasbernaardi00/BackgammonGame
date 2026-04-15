/**
 * @jest-environment jsdom
 */

import {
    createTournament,
    joinTournament,
    findTournament,
    stopSearching,
    handleGiveUp,
    getUsername,
    socket
  } from "../Tornei";
  
  // Poiché vogliamo testare le funzioni senza avviare una connessione reale,
  // utilizziamo uno spy su socket.emit. Inoltre, jsdom fornisce già localStorage,
  // ma se serve possiamo definirlo (qui lo usiamo per impostare un token fittizio).
  
  describe("Funzioni di Tornei.tsx", () => {
    beforeEach(() => {
      // Pulizia del localStorage e impostazione del token fittizio
      localStorage.clear();
      // Il token fittizio contiene il payload: {"username": "testUser"}
      const fakeJwt =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
        "eyJ1c2VybmFtZSI6InRlc3RVc2VyIn0." +
        "firmaFinta";
      localStorage.setItem("token", fakeJwt);
  
      // Ripulisce lo spy su socket.emit (se già presente)
      jest.spyOn(socket, "emit").mockClear();
    });
  
    test("getUsername restituisce 'testUser'", () => {
      expect(getUsername()).toBe("testUser");
    });
  
    test("createTournament emette 'createTournament' con 'testUser'", () => {
      const emitSpy = jest.spyOn(socket, "emit");
      createTournament();
      expect(emitSpy).toHaveBeenCalledWith("createTournament", "testUser");
    });
  
    test("joinTournament emette 'joinTournament' con ID e 'testUser'", () => {
      const emitSpy = jest.spyOn(socket, "emit");
      joinTournament("tournament123");
      expect(emitSpy).toHaveBeenCalledWith("joinTournament", "tournament123", "testUser");
    });
  
    test("findTournament emette 'findTournament' con 'testUser'", () => {
      const emitSpy = jest.spyOn(socket, "emit");
      findTournament();
      expect(emitSpy).toHaveBeenCalledWith("findTournament", "testUser");
    });
  
    test("stopSearching emette 'stopSearching' con 'testUser'", () => {
      const emitSpy = jest.spyOn(socket, "emit");
      stopSearching();
      expect(emitSpy).toHaveBeenCalledWith("stopSearching", "testUser");
    });
  
    test("handleGiveUp non emette nulla se gameId è nullo", () => {
      const emitSpy = jest.spyOn(socket, "emit");
      handleGiveUp(null, "White");
      expect(emitSpy).not.toHaveBeenCalled();
    });
  
    test("handleGiveUp emette 'exitGame' se gameId è valido", () => {
      const emitSpy = jest.spyOn(socket, "emit");
      handleGiveUp("game123", "White");
      expect(emitSpy).toHaveBeenCalledWith("exitGame", "game123");
    });
  });