import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch
from http.cookies import SimpleCookie

# Load native dependencies before patch.dict restores the module registry.
import bcrypt
import jwt
from fastapi import Response


class AuthCookieTests(unittest.TestCase):
    def load_security(self, environment, secure):
        config = types.ModuleType('app.core.constants')
        config.constants = types.SimpleNamespace(APP_ENV=environment, COOKIE_SECURE=secure)
        spec = importlib.util.spec_from_file_location(
            'cookie_security_under_test',
            Path(__file__).resolve().parents[1] / 'src/app/core/security.py',
        )
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'app.core.constants': config}):
            spec.loader.exec_module(module)
        return module

    def test_cookie_security_and_logout_paths(self):
        for environment, configured, expected in [
            ('development', False, False),
            ('development', True, True),
            ('production', False, True),
            ('production', True, True),
        ]:
            with self.subTest(environment=environment, secure=configured):
                security = self.load_security(environment, configured)
                response = Response()
                security.set_auth_cookies(response, 'test-access', 'test-refresh')
                cookies = SimpleCookie()
                for header in response.headers.getlist('set-cookie'):
                    cookies.load(header)
                for name, path in [('access_token', '/'), ('refresh_token', '/api/v1/auth')]:
                    self.assertEqual(bool(cookies[name]['secure']), expected)
                    self.assertTrue(cookies[name]['httponly'])
                    self.assertEqual(cookies[name]['path'], path)
                    self.assertEqual(cookies[name]['samesite'], 'lax')
                cleared = Response()
                security.clear_auth_cookies(cleared)
                deleted = SimpleCookie()
                for header in cleared.headers.getlist('set-cookie'):
                    deleted.load(header)
                for name in cookies:
                    self.assertEqual(deleted[name]['path'], cookies[name]['path'])
                    self.assertEqual(bool(deleted[name]['secure']), expected)
                    self.assertEqual(deleted[name]['max-age'], '0')
                    self.assertIn('1970', deleted[name]['expires'])

    def test_dynamic_expiration_arguments(self):
        from datetime import timedelta
        security = self.load_security('development', False)
        response = Response()
        custom_access = timedelta(hours=3)
        custom_refresh = timedelta(days=14)

        security.set_auth_cookies(
            response,
            'access-val',
            'refresh-val',
            access_token_expires=custom_access,
            refresh_token_expires=custom_refresh,
        )

        cookies = SimpleCookie()
        for header in response.headers.getlist('set-cookie'):
            cookies.load(header)

        self.assertEqual(cookies['access_token']['max-age'], str(int(custom_access.total_seconds())))
        self.assertTrue(len(cookies['access_token']['expires']) > 0)
        self.assertEqual(cookies['refresh_token']['max-age'], str(int(custom_refresh.total_seconds())))
        self.assertTrue(len(cookies['refresh_token']['expires']) > 0)


if __name__ == '__main__':
    unittest.main()
