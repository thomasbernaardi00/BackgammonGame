/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Menu from "../frontend/components/Menu";

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: jest.fn(),
}));

describe("Menu navigation", () => {
    const mockNavigate = jest.fn();
    beforeEach(() => {
        (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    });

    const buttonTests = [
      { label: "Bot vs Bot", route: "/Play"},
      { label: "Player vs Bot", route: "/Playvsbot"},
      { label: "Play online", route: "/Client"},
      { label: "Tournament mode", route: "/tornei"},
      { label: "Friends", route: "/friends"},
      { label: "Guide", route: "/Guide"},
      { label: "Leaderboard", route: "/classifica"},
      { label: "User Info", route: "/user-profile"},
    ];

    buttonTests.forEach(({ label, route }) => {
      test(`cliccando su '${label}' dovrebbe andare su ${route}`, () => {
        render(
         <MemoryRouter>
          <Menu onSelectOption={() => {}} />
         </MemoryRouter> 
        );

        const button = screen.getByText(label);
        fireEvent.click(button);
        expect(mockNavigate).toHaveBeenCalledWith(route);
      });
    });


    beforeAll(() => {
      // Simula la presenza di window.FB
      (global as any).FB = {
        ui: jest.fn((params, callback) => callback({ success: true })),
      };
    });
    
    afterAll(() => {
      delete (global as any).FB; // Ripulisce il mock dopo i test
    });

    test("cliccando su 'Share on Facebook!' si dovrebbe aprire una finestra di condivisione", () => {
      render(
        <MemoryRouter>
         <Menu onSelectOption={() => {}} /> 
        </MemoryRouter>
      );

      const mockOpen = jest.spyOn(window, "open").mockImplementation(() => null);
      localStorage.setItem("user", JSON.stringify({ username: "TestUser", score: 100}));

      const button = screen.getByRole("button", {name: /share on facebook/i});
      fireEvent.click(button);

      expect(mockOpen).toHaveBeenCalled();
      mockOpen.mockRestore();
    });
    });
