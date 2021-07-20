import { printSupergraphSdl } from '@apollo/federation';
import fs from 'fs';
import { GraphQLSchema, parse } from 'graphql';
import path from 'path';
import { buildComposedSchema, toAPISchema } from '..';

describe('toAPISchema', () => {
  let schema: GraphQLSchema;

  beforeAll(() => {
    const schemaPath = path.join(
      __dirname,
      '../../__tests__/features/basic/',
      'supergraphSdl.graphql',
    );
    const supergraphSdl = fs.readFileSync(schemaPath, 'utf8');

    schema = toAPISchema(buildComposedSchema(parse(supergraphSdl)));
  });

  it(`doesn't include core directives`, () => {
    const directiveNames = schema
      .getDirectives()
      .map((directive) => directive.name);

    expect(directiveNames).toEqual(expect.not.arrayContaining(['core']));
  });

  it(`doesn't include join directives`, () => {
    const directiveNames = schema
      .getDirectives()
      .map((directive) => directive.name);

    expect(directiveNames).toEqual(
      expect.not.arrayContaining([
        'join__graph',
        'join__type',
        'join__owner',
        'join__field',
      ]),
    );
  });

  it(`doesn't include join types`, () => {
    const typeNames = Object.keys(schema.getTypeMap());

    expect(typeNames).toEqual(
      expect.not.arrayContaining(['join__FieldSet', 'join__Graph']),
    );
  });

  it(`does pass through other custom directives`, () => {
    expect(schema.getDirectives()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'transform' }),
        expect.objectContaining({ name: 'stream' }),
      ]),
    );
  });

  it(`doesn't include @tag or @inaccessible directives`, () => {
    expect(printSupergraphSdl(schema, [])).toMatchInlineSnapshot(`
      "schema
        @core(feature: \\"https://specs.apollo.dev/core/v0.1\\"),
        @core(feature: \\"https://specs.apollo.dev/join/v0.1\\")
      {
        query: Query
        mutation: Mutation
      }

      directive @core(feature: String!) repeatable on SCHEMA

      directive @join__field(graph: join__Graph, requires: join__FieldSet, provides: join__FieldSet) on FIELD_DEFINITION

      directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on OBJECT | INTERFACE

      directive @join__owner(graph: join__Graph!) on OBJECT | INTERFACE

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE

      directive @stream on FIELD

      directive @transform(from: String!) on FIELD

      type Account {
        type: String
      }

      union AccountType = PasswordAccount | SMSAccount

      type Amazon {
        referrer: String
      }

      union Body = Image | Text

      type Book implements Product
      {
        isbn: String!
        title: String
        year: Int
        similarBooks: [Book]!
        metadata: [MetadataOrError]
        inStock: Boolean
        isCheckedOut: Boolean
        upc: String!
        sku: String!
        name(delimeter: String = \\" \\"): String @join__field(requires: \\"title year\\")
        price: String
        details: ProductDetailsBook
        reviews: [Review]
        relatedReviews: [Review!]! @join__field(requires: \\"similarBooks{isbn}\\")
      }

      union Brand = Ikea | Amazon

      type Car implements Vehicle
      {
        id: String!
        description: String
        price: String
        retailPrice: String @join__field(requires: \\"price\\")
        thing: Thing
      }

      type Error {
        code: Int
        message: String
      }

      type Furniture implements Product
      {
        upc: String!
        sku: String!
        name: String
        price: String
        brand: Brand
        metadata: [MetadataOrError]
        details: ProductDetailsFurniture
        inStock: Boolean
        isHeavy: Boolean
        reviews: [Review]
      }

      type Ikea {
        asile: Int
      }

      type Image {
        name: String!
        attributes: ImageAttributes!
      }

      type ImageAttributes {
        url: String!
      }

      scalar join__FieldSet

      enum join__Graph

      type KeyValue {
        key: String!
        value: String!
      }

      type Library
      {
        id: ID!
        name: String
        userAccount(id: ID! = 1): User @join__field(requires: \\"name\\")
      }

      union MetadataOrError = KeyValue | Error

      type Mutation {
        login(username: String!, password: String!): User
        reviewProduct(upc: String!, body: String!): Product
        updateReview(review: UpdateReviewInput!): Review
        deleteReview(id: ID!): Boolean
      }

      type Name {
        first: String
        last: String
      }

      type PasswordAccount
      {
        email: String!
      }

      interface Product {
        upc: String!
        sku: String!
        name: String
        price: String
        details: ProductDetails
        inStock: Boolean
        reviews: [Review]
      }

      interface ProductDetails {
        country: String
      }

      type ProductDetailsBook implements ProductDetails {
        country: String
        pages: Int
      }

      type ProductDetailsFurniture implements ProductDetails {
        country: String
        color: String
      }

      type Query {
        user(id: ID!): User
        me: User
        book(isbn: String!): Book
        books: [Book]
        library(id: ID!): Library
        body: Body!
        product(upc: String!): Product
        vehicle(id: String!): Vehicle
        topProducts(first: Int = 5): [Product]
        topCars(first: Int = 5): [Car]
        topReviews(first: Int = 5): [Review]
      }

      type Review
      {
        id: ID!
        body(format: Boolean = false): String
        author: User @join__field(provides: \\"username\\")
        product: Product
        metadata: [MetadataOrError]
      }

      type SMSAccount
      {
        number: String
      }

      type Text {
        name: String!
        attributes: TextAttributes!
      }

      type TextAttributes {
        bold: Boolean
        text: String
      }

      union Thing = Car | Ikea

      input UpdateReviewInput {
        id: ID!
        body: String
      }

      type User
      {
        id: ID!
        name: Name
        username: String
        birthDate(locale: String): String
        account: Account
        accountType: AccountType
        metadata: [UserMetadata]
        goodDescription: Boolean @join__field(requires: \\"metadata{description}\\")
        vehicle: Vehicle
        thing: Thing
        reviews: [Review]
        numberOfReviews: Int!
        goodAddress: Boolean @join__field(requires: \\"metadata{address}\\")
      }

      type UserMetadata {
        name: String
        address: String
        description: String
      }

      type Van implements Vehicle
      {
        id: String!
        description: String
        price: String
        retailPrice: String @join__field(requires: \\"price\\")
      }

      interface Vehicle {
        id: String!
        description: String
        price: String
        retailPrice: String
      }
      "
    `);
  });
});
