# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - heading "Sign in" [level=1] [ref=e7]
      - paragraph [ref=e8]: Enter your email and password to access your account
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: Email
        - textbox "Email" [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Password
          - link "Forgot password?" [ref=e15] [cursor=pointer]:
            - /url: /auth/reset-password
        - textbox "Password" [active] [ref=e16]
      - button "Sign in" [disabled]
    - generic [ref=e17]:
      - text: Don't have an account?
      - link "Sign up" [ref=e18] [cursor=pointer]:
        - /url: /auth/sign-up
  - generic [ref=e21]:
    - button "Menu" [ref=e22]:
      - img [ref=e24]
      - generic: Menu
    - button "Inspect" [ref=e28]:
      - img [ref=e30]
      - generic: Inspect
    - button "Audit" [ref=e32]:
      - img [ref=e34]
      - generic: Audit
    - button "Settings" [ref=e37]:
      - img [ref=e39]
      - generic: Settings
```