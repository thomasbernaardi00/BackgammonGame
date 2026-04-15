import { TextEncoder, TextDecoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import Guide from "../frontend/components/Guide";
import "@testing-library/jest-dom"
import { MemoryRouter, useNavigate } from "react-router-dom";
import React from "react";


jest.mock("../frontend/components/GuidePages/Photos/foto1.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto2.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto3.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto4.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto5.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto6.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto7.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto8.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto9.png", () => "mock-image");
jest.mock("../frontend/components/GuidePages/Photos/foto10.png", () => "mock-image");

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));


describe("Guide Component", () => {
  
  const mockNavigate = jest.fn();
  beforeEach(() => {
      (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  test("Dovrebbe renderizzare la prima pagina all'inizio", () => {
    render(
    <MemoryRouter>
      <Guide />
    </MemoryRouter>);

    expect(screen.getByText("Welcome to the Backgammon Guide!")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 6")).toBeInTheDocument();
  });

  test("Dovrebbe cambiare pagina quando si preme 'Next'", () => {
    render(
      <MemoryRouter>
        <Guide />
      </MemoryRouter>);

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    expect(screen.getByText("Page 2 of 6")).toBeInTheDocument();
  });

  test("Dovrebbe cambiare pagina quando si preme 'Previous'", () => {
    render
      (
        <MemoryRouter>
          <Guide />
        </MemoryRouter>
      );

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    const prevButton = screen.getByText("Previous");
    fireEvent.click(prevButton);

    expect(screen.getByText("Page 1 of 6")).toBeInTheDocument();
  });

  test("Dovrebbe selezionare una pagina direttamente", () => {
    render(
      <MemoryRouter>
        <Guide />
      </MemoryRouter>);

    const page3Button = screen.getByText("3");
    fireEvent.click(page3Button);

    expect(screen.getByText("Page 3 of 6")).toBeInTheDocument();
  });

  test("Dovrebbe navigare al menu principale", () => {
    render(
      <MemoryRouter>
        <Guide />
      </MemoryRouter>);

    const menuButton = screen.getByText("Return to the main Menu");
    fireEvent.click(menuButton);
    
    // Controlla se la navigazione avviene (simulata nel MemoryRouter)
    expect(mockNavigate).toHaveBeenCalledWith("/menu");
  });
});