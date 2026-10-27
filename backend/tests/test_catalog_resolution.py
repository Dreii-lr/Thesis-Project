import unittest
from types import SimpleNamespace as Record
from unittest.mock import AsyncMock

from app.shared.text_matching import normalize_match_text
from app.features.subjects.resolver import resolve_catalog, CatalogMatchError, InvalidCatalogError


class CatalogTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.program = Record(category_id='p1', name='Secondary', code='SECONDARY')
        self.subject = Record(subject_id='s1', category_id='p1', name='Filipino', description=None, is_active=True)
        self.uow = Record(
            user_categories=Record(list=AsyncMock(return_value=([self.program], 1))),
            subjects=Record(get_all_by_category=AsyncMock(return_value=[self.subject])),
        )

    def test_normalizer(self):
        for value in [None, '', ' \t\n']:
            self.assertEqual(normalize_match_text(value), '')
        self.assertEqual(normalize_match_text('  FiLiPiNo\t Language \n'), 'filipino language')
        for value in [1, [], {}, False]:
            with self.assertRaises(TypeError):
                normalize_match_text(value)

    async def test_aliases_and_canonical_names(self):
        for alias in [' JHS ', 'junior HIGH school', 'secondary', 'Junior High School (JHS)', 'A&E Secondary', 'Secondary Level']:
            for strand in [' FILIPINO ', 'I- Filipino', 'LS1: Filipino', 'LS1-Filipino', 'ls1 - filipino']:
                result = await resolve_catalog(self.uow, alias, strand)
                self.assertEqual(result['program_name'], 'Secondary')
                self.assertEqual(result['subject_name'], 'Filipino')
        self.uow.subjects.get_all_by_category.assert_awaited_with('p1')
        self.program.name, self.program.code = 'Basic Literacy Program', 'BLP'
        for alias in ['blp', ' BASIC   LITERACY PROGRAM ', 'Basic Literacy Program (BLP)']:
            self.assertEqual((await resolve_catalog(self.uow, alias, 'filipino'))['program_name'], self.program.name)

    async def test_near_match_strand_mapped_to_database_canonical_name(self):
        self.subject.name = 'LS1 - Filipino'
        other_subject = Record(subject_id='s2', category_id='p1', name='LS1 - English', description=None, is_active=True)
        self.uow.subjects.get_all_by_category.return_value = [self.subject, other_subject]
        for strand in [
            'LS1-Filipino',
            'ls1-filipino',
            'LS1 - FILIPINO',
            'LS 1 - Filipino',
            'LS1: Filipino',
            'LS1 (Filipino)',
            'Learning Strand 1 - Filipino',
            'Learning Strand 1: Communication Skills (Filipino)',
            '1- Communication Skills in Filipino',
            'Filipino',
        ]:
            result = await resolve_catalog(self.uow, 'Junior High School', strand)
            self.assertEqual(result['subject_id'], 's1')
            self.assertEqual(result['subject_name'], 'LS1 - Filipino')
            self.assertEqual(result['program_name'], 'Secondary')

    async def test_dynamic_program_and_ls1_to_ls6_resolution(self):
        elem = Record(category_id='cat-elem', name='Elementary', code='ELEMENTARY')
        sec = Record(category_id='cat-sec', name='Secondary', code='SECONDARY')
        blp = Record(category_id='cat-blp', name='Basic Literacy Program', code='BLP')
        self.uow.user_categories.list.return_value = ([elem, sec, blp], 3)

        elem_subjects = [
            Record(subject_id='e1-en', category_id='cat-elem', name='LS1 - English', description=None, is_active=True),
            Record(subject_id='e1-fil', category_id='cat-elem', name='LS1 - Filipino', description=None, is_active=True),
            Record(subject_id='e2', category_id='cat-elem', name='LS2 - Science', description=None, is_active=True),
            Record(subject_id='e3', category_id='cat-elem', name='LS3 - MATH', description=None, is_active=True),
            Record(subject_id='e4', category_id='cat-elem', name='LS4 - Life and Career', description=None, is_active=True),
            Record(subject_id='e5', category_id='cat-elem', name='LS5 - Understanding the Self and Society', description=None, is_active=True),
            Record(subject_id='e6', category_id='cat-elem', name='LS6 - Digital Citizenship', description=None, is_active=True),
        ]
        self.uow.subjects.get_all_by_category.return_value = elem_subjects

        # Exact user case: als_program='A&E Elementary', learning_strand='2- Scientific and Critical Thinking Skills'
        for prog_variant in ['A&E Elementary', 'a&e elementary', 'A & E - ELEMENTARY LEVEL', 'Elementary']:
            res = await resolve_catalog(self.uow, prog_variant, '2- Scientific and Critical Thinking Skills')
            self.assertEqual(res['category_id'], 'cat-elem')
            self.assertEqual(res['program_name'], 'Elementary')
            self.assertEqual(res['subject_id'], 'e2')
            self.assertEqual(res['subject_name'], 'LS2 - Science')

        # Test all 1..6 strands dynamically mapping to LS1..LS6
        cases = [
            ('1- Communication Skills in English', 'e1-en', 'LS1 - English'),
            ('1- Communication Skills in Filipino', 'e1-fil', 'LS1 - Filipino'),
            ('2- Scientific and Critical Thinking Skills', 'e2', 'LS2 - Science'),
            ('3- Mathematical and Problem Solving Skills', 'e3', 'LS3 - MATH'),
            ('4- Life and Career Skills', 'e4', 'LS4 - Life and Career'),
            ('5- Understanding the Self and Society', 'e5', 'LS5 - Understanding the Self and Society'),
            ('6- Digital Literacy', 'e6', 'LS6 - Digital Citizenship'),
        ]
        for strand_input, expected_id, expected_name in cases:
            res = await resolve_catalog(self.uow, 'A&E Elementary', strand_input)
            self.assertEqual(res['subject_id'], expected_id)
            self.assertEqual(res['subject_name'], expected_name)



    async def test_invalid_input(self):
        for value in [None, '', '  ', 1, [], {}]:
            for program, strand in [(value, 'Filipino'), ('JHS', value)]:
                with self.assertRaises(CatalogMatchError):
                    await resolve_catalog(self.uow, program, strand)

    async def test_name_priority_and_description_boundaries(self):
        other = Record(subject_id='s2', category_id='p1', name='Communication', description='Study FILIPINO language.', is_active=True)
        self.uow.subjects.get_all_by_category.return_value = [self.subject, other]
        self.assertEqual((await resolve_catalog(self.uow, 'JHS', 'Filipino'))['subject_id'], 's1')
        self.uow.subjects.get_all_by_category.return_value = [other]
        self.assertEqual((await resolve_catalog(self.uow, 'JHS', ' FILIPINO '))['subject_id'], 's2')
        with self.assertRaises(CatalogMatchError):
            await resolve_catalog(self.uow, 'JHS', 'Fil')
        other.description = None
        with self.assertRaises(CatalogMatchError):
            await resolve_catalog(self.uow, 'JHS', 'Filipino')

    async def test_ambiguous_matches(self):
        self.uow.user_categories.list.return_value = ([self.program, Record(category_id='p2', name='Junior High School', code=None)], 2)
        with self.assertRaises(CatalogMatchError):
            await resolve_catalog(self.uow, 'JHS', 'Filipino')
        self.uow.subjects.get_all_by_category.assert_not_awaited()
        self.uow.user_categories.list.return_value = ([self.program], 1)
        self.uow.subjects.get_all_by_category.return_value = [self.subject, Record(**vars(self.subject))]
        with self.assertRaises(CatalogMatchError):
            await resolve_catalog(self.uow, 'JHS', 'Filipino')
        for item in self.uow.subjects.get_all_by_category.return_value:
            item.name, item.description = 'Communication', 'Learning Filipino language'
        with self.assertRaises(CatalogMatchError):
            await resolve_catalog(self.uow, 'JHS', 'Filipino')

    async def test_program_boundary_inactive_and_empty(self):
        for changes in [{'category_id': 'other'}, {'is_active': False}]:
            self.uow.subjects.get_all_by_category.return_value = [Record(**(vars(self.subject) | changes))]
            with self.assertRaises(CatalogMatchError):
                await resolve_catalog(self.uow, 'JHS', 'Filipino')
        self.uow.subjects.get_all_by_category.return_value = []
        with self.assertRaises(CatalogMatchError):
            await resolve_catalog(self.uow, 'JHS', 'Filipino')

    async def test_malformed_catalog(self):
        for changes in [{'subject_id': None}, {'name': None, 'description': 'Filipino'}, {'description': 123, 'name': 'Other'}]:
            self.uow.subjects.get_all_by_category.return_value = [Record(**(vars(self.subject) | changes))]
            with self.assertRaises(InvalidCatalogError):
                await resolve_catalog(self.uow, 'JHS', 'Filipino')


if __name__ == '__main__':
    unittest.main()
