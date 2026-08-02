import re

PATTERN = 'resp.data.get("results", resp.data)'
REPLACEMENT = '(resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))'

for path in [
    'tests/test_crm.py',
    'tests/test_management.py',
    'tests/test_permissions_matrix.py',
    'tests/test_properties.py',
]:
    txt = open(path, encoding='utf-8').read()
    fixed = txt.replace(PATTERN, REPLACEMENT)
    open(path, 'w', encoding='utf-8').write(fixed)
    count = txt.count(PATTERN)
    print(f'Fixed {count} occurrence(s) in {path}')
