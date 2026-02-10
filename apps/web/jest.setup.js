require("@testing-library/jest-dom");

jest.mock("next/image", () => ({
  __esModule: true,
  default: function NextImage(props) {
    const resolvedSrc =
      typeof props.src === "string" ? props.src : props.src?.src || "";
    return require("react").createElement("img", {
      ...props,
      src: resolvedSrc,
    });
  },
}));

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
