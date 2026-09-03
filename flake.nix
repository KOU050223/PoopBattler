{
  description = "poop-battler dev environment";

  inputs.nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0";

  outputs =
    { ... }@inputs:
    let
      inherit (inputs.nixpkgs) lib;

      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      forEachSupportedSystem =
        f: lib.genAttrs supportedSystems (system: f inputs.nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forEachSupportedSystem (pkgs: {
        default = pkgs.mkShellNoCC {
          packages = [
            pkgs.nodejs_24
            pkgs.supabase-cli
            # Stripe Webhook をローカルへ転送し、実際のイベントで課金経路を確かめる。
            #   stripe listen --forward-to localhost:3000/api/stripe/webhook
            pkgs.stripe-cli
          ];
        };
      });

      formatter = forEachSupportedSystem (pkgs: pkgs.nixfmt);
    };
}
