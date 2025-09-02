import type { JsonSchema, NipPlugin, RelayInfo } from "@nostr-relay/types"

type Nip11Config = RelayInfo

export const nip11Plugin: NipPlugin<Nip11Config> = {
  id: "nip-11",
  nip: 11,
  defaultConfig: {
    name: "My Nostr Relay",
    description: "A modular, community-focused Nostr relay",
    software: "nostr-relay-cf-worker",
    version: "0.0.1",
    supported_nips: [11]
  },
  configSchema: {
    type: "object",
    properties: {
      name: { 
        type: "string", 
        title: "Relay Name",
        description: "Human-readable name for your relay (max 30 chars recommended). This appears in relay lists and client UI. Choose something memorable that reflects your community or purpose."
      },
      description: { 
        type: "string", 
        title: "Description",
        description: "Detailed description of your relay's purpose, rules, and community focus. Use double newlines for paragraphs. Explain what makes your relay special and any posting guidelines."
      },
      pubkey: { 
        type: "string", 
        title: "Admin Public Key",
        description: "Your public key as relay admin (64-char hex or npub format). Users can send you encrypted DMs for abuse reports, technical issues, or questions. Optional but recommended for transparency."
      },
      contact: { 
        type: "string", 
        title: "Contact Information",
        description: "Alternative contact method (email, website, etc.). Use mailto: or https: URLs. Example: 'mailto:admin@relay.com' or 'https://mysite.com/contact'. Backup to pubkey contact."
      },
      software: { 
        type: "string", 
        title: "Software URL",
        description: "URL to relay software homepage. Helps users understand your relay implementation and find documentation. Default points to this project's repository."
      },
      version: { 
        type: "string", 
        title: "Software Version",
        description: "Version identifier for your relay software. Can be a version number, commit hash, or date. Useful for debugging and compatibility tracking."
      },
      payments_url: { 
        type: "string", 
        title: "Payments URL",
        description: "URL for payment information if you charge for relay access. Link to Lightning invoices, subscription page, or donation info. Leave empty for free relays."
      },
      supported_nips: { 
        type: "array", 
        title: "Supported NIPs", 
        items: { type: "number" },
        description: "List of NIP numbers your relay supports. Auto-populated based on enabled plugins. Common NIPs: 1=basic protocol, 9=event deletion, 11=relay info, 22=event created_at limits, 42=authentication."
      }
    },
    required: ["name", "description"]
  } satisfies JsonSchema,
  setup() {}
}

export default nip11Plugin
